import type { AlgorithmEvent, MetroGraph, RouteRequest, RoutingOptions } from '../types/graph.ts'
import { buildAdjacency, reconstructPath } from './graphUtils.ts'
import type { Parent } from './graphUtils.ts'

/** Fewest connections. Ties follow connection order in the input graph. */
export function bfs(graph: MetroGraph, request: RouteRequest, options: RoutingOptions = {}): AlgorithmEvent[] {
  const adjacency = buildAdjacency(graph, request, options)
  const events: AlgorithmEvent[] = [{ type: 'start', algorithm: 'BFS', ...request }]
  if (options.closedStationIds?.has(request.origin) || options.closedStationIds?.has(request.destination)) {
    return [...events, { type: 'complete', reachable: false }]
  }
  const queue = [{ stationId: request.origin, priority: 0 }]
  const discovered = new Set([request.origin])
  const parents = new Map<string, Parent>()
  events.push({ type: 'discovered', stationId: request.origin, predecessor: null })
  events.push({ type: 'frontier', entries: [...queue] })
  while (queue.length > 0) {
    const current = queue.shift()!
    events.push({ type: 'frontier', entries: [...queue] }, { type: 'current', stationId: current.stationId })
    if (current.stationId === request.destination) {
      events.push({ type: 'visited', stationId: current.stationId }, { type: 'destination-found', stationId: current.stationId })
      events.push(reconstructPath(request.destination, parents), { type: 'complete', reachable: true })
      return events
    }
    for (const { stationId, connection } of adjacency.get(current.stationId)!) {
      events.push({ type: 'edge-explored', connectionId: connection.id, from: current.stationId, to: stationId })
      if (discovered.has(stationId)) continue
      discovered.add(stationId)
      parents.set(stationId, { stationId: current.stationId, connection })
      queue.push({ stationId, priority: current.priority + 1 })
      events.push({ type: 'discovered', stationId, predecessor: current.stationId }, { type: 'frontier', entries: [...queue] })
    }
    events.push({ type: 'visited', stationId: current.stationId })
  }
  events.push({ type: 'complete', reachable: false })
  return events
}
