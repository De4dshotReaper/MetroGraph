import type { AlgorithmEvent, MetroGraph, RouteRequest, RoutingOptions } from '../types/graph.ts'
import { buildAdjacency, reconstructPath } from './graphUtils.ts'
import type { Parent } from './graphUtils.ts'

/** Minimum travel time. A small sorted frontier keeps ties in insertion order. */
export function dijkstra(graph: MetroGraph, request: RouteRequest, options: RoutingOptions = {}): AlgorithmEvent[] {
  const adjacency = buildAdjacency(graph, request, options)
  const events: AlgorithmEvent[] = [{ type: 'start', algorithm: 'Dijkstra', ...request }]
  if (options.closedStationIds?.has(request.origin) || options.closedStationIds?.has(request.destination)) {
    return [...events, { type: 'complete', reachable: false }]
  }
  const frontier = new Map([[request.origin, 0]])
  const distances = new Map([[request.origin, 0]])
  const visited = new Set<string>()
  const parents = new Map<string, Parent>()
  const snapshot = () => [...frontier].map(([stationId, priority]) => ({ stationId, priority })).sort((a, b) => a.priority - b.priority)
  events.push({ type: 'discovered', stationId: request.origin, predecessor: null }, { type: 'distance-updated', stationId: request.origin, distance: 0, predecessor: null })
  events.push({ type: 'frontier', entries: snapshot() })
  while (frontier.size > 0) {
    const current = snapshot()[0]!
    frontier.delete(current.stationId)
    visited.add(current.stationId)
    events.push({ type: 'frontier', entries: snapshot() }, { type: 'current', stationId: current.stationId })
    if (current.stationId === request.destination) {
      events.push({ type: 'visited', stationId: current.stationId }, { type: 'destination-found', stationId: current.stationId })
      events.push(reconstructPath(request.destination, parents), { type: 'complete', reachable: true })
      return events
    }
    for (const { stationId, connection } of adjacency.get(current.stationId)!) {
      events.push({ type: 'edge-explored', connectionId: connection.id, from: current.stationId, to: stationId })
      if (visited.has(stationId)) continue
      const distance = current.priority + connection.weight
      if (distance >= (distances.get(stationId) ?? Infinity)) continue
      if (!distances.has(stationId)) events.push({ type: 'discovered', stationId, predecessor: current.stationId })
      distances.set(stationId, distance)
      parents.set(stationId, { stationId: current.stationId, connection })
      frontier.set(stationId, distance)
      events.push({ type: 'distance-updated', stationId, distance, predecessor: current.stationId }, { type: 'frontier', entries: snapshot() })
    }
    events.push({ type: 'visited', stationId: current.stationId })
  }
  events.push({ type: 'complete', reachable: false })
  return events
}
