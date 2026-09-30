import type { AlgorithmEvent, MetroGraph } from '../types/graph.ts'

interface EdgeCalculation { from: string; to: string; connectionId: string; eventIndex: number; current: number }
export type LiveCalculationState =
  | (EdgeCalculation & { algorithm: 'BFS'; cost: 1; candidate: number; outcome: 'pending' | 'discovered' | 'known' })
  | (EdgeCalculation & { algorithm: 'Dijkstra'; cost: number; candidate: number | null; previous: number; outcome: 'update' | 'keep' | 'settled' })

function confirmDiscovery(calculation: LiveCalculationState | null, stationId: string): LiveCalculationState | null {
  return calculation?.algorithm === 'BFS' && calculation.to === stationId && calculation.outcome === 'pending'
    ? { ...calculation, outcome: 'discovered' }
    : calculation
}

/** Read only the consumed prefix: previous best must precede the relaxation update.
 * Rebuilding this small projection also makes reset, replay, and reroute stateless.
 */
export function deriveLiveCalculation(graph: MetroGraph, events: readonly AlgorithmEvent[], cursor: number): LiveCalculationState | null {
  const connections = new Map(graph.connections.map(edge => [edge.id, edge]))
  const depths = new Map<string, number>()
  const distances = new Map<string, number>()
  const settled = new Set<string>()
  let algorithm: 'BFS' | 'Dijkstra' = 'BFS'
  let calculation: LiveCalculationState | null = null
  for (let index = 0; index < Math.min(cursor, events.length); index++) {
    const event = events[index]!
    switch (event.type) {
      case 'start':
        algorithm = event.algorithm
        depths.clear(); distances.clear(); settled.clear(); calculation = null
        break
      case 'discovered':
        if (algorithm === 'BFS') {
          const parentDepth = event.predecessor === null ? -1 : depths.get(event.predecessor)
          if (parentDepth !== undefined) depths.set(event.stationId, parentDepth + 1)
          calculation = confirmDiscovery(calculation, event.stationId)
        }
        break
      case 'distance-updated': distances.set(event.stationId, event.distance); break
      // Dijkstra settles a vertex when it becomes current, before examining edges.
      case 'current': if (algorithm === 'Dijkstra') settled.add(event.stationId); break
      case 'edge-explored': {
        const edge = connections.get(event.connectionId)
        const current = algorithm === 'BFS' ? depths.get(event.from) : distances.get(event.from)
        if (!edge || current === undefined) break
        const base = { from: event.from, to: event.to, connectionId: event.connectionId, eventIndex: index, current }
        if (algorithm === 'BFS') {
          calculation = { ...base, algorithm, cost: 1, candidate: current + 1, outcome: depths.has(event.to) ? 'known' : 'pending' }
        } else {
          const previous = distances.get(event.to) ?? Infinity
          // The algorithm skips settled targets before adding/comparing weights.
          const candidate = settled.has(event.to) ? null : current + edge.weight
          calculation = { ...base, algorithm, cost: edge.weight, candidate, previous, outcome: candidate === null ? 'settled' : candidate < previous ? 'update' : 'keep' }
        }
        break
      }
      default: break // Preserve the latest calculation through bookkeeping events.
    }
  }
  return calculation
}
