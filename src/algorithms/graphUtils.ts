import type { AlgorithmEvent, Connection, MetroGraph, RouteRequest, RoutingOptions, StationId } from '../types/graph.ts'

export interface Neighbor { stationId: StationId; connection: Connection }
export interface Parent { stationId: StationId; connection: Connection }

export function buildAdjacency(graph: MetroGraph, request: RouteRequest, options: RoutingOptions = {}) {
  const adjacency = new Map<StationId, Neighbor[]>()
  for (const station of graph.stations) {
    if (adjacency.has(station.id)) throw new Error(`Duplicate station: ${station.id}`)
    adjacency.set(station.id, [])
  }
  if (!adjacency.has(request.origin) || !adjacency.has(request.destination)) {
    throw new Error('Origin and destination must exist in the graph.')
  }
  const edgeIds = new Set<string>()
  for (const connection of graph.connections) {
    const from = adjacency.get(connection.from)
    const to = adjacency.get(connection.to)
    if (!from || !to) throw new Error(`Unknown station on connection: ${connection.id}`)
    if (!Number.isFinite(connection.weight) || connection.weight < 0) {
      throw new Error('Travel times must be finite and nonnegative.')
    }
    if (edgeIds.has(connection.id)) throw new Error(`Duplicate connection: ${connection.id}`)
    edgeIds.add(connection.id)
    if (options.closedStationIds?.has(connection.from) || options.closedStationIds?.has(connection.to)) continue
    from.push({ stationId: connection.to, connection })
    to.push({ stationId: connection.from, connection })
  }
  return adjacency
}

export function reconstructPath(destination: StationId, parents: ReadonlyMap<StationId, Parent>): AlgorithmEvent {
  const stationIds = [destination]
  const connectionIds: string[] = []
  let travelTime = 0
  let current = destination
  let parent = parents.get(current)
  while (parent) {
    stationIds.push(parent.stationId)
    connectionIds.push(parent.connection.id)
    travelTime += parent.connection.weight
    current = parent.stationId
    parent = parents.get(current)
  }
  return { type: 'path', stationIds: stationIds.reverse(), connectionIds: connectionIds.reverse(), travelTime }
}
