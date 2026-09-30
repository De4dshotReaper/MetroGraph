export type StationId = string
export type LineId = string

export interface Station {
  id: StationId
  name: string
  x: number
  y: number
  lineIds: readonly LineId[]
  isInterchange: boolean
}

export interface Connection {
  id: string
  from: StationId
  to: StationId
  /** Nonnegative travel time in minutes. Connections are bidirectional. */
  weight: number
  lineId: LineId
}

export interface MetroLine {
  id: LineId
  name: string
  color: string
}

export interface MetroGraph {
  stations: readonly Station[]
  connections: readonly Connection[]
  lines: readonly MetroLine[]
}

export type Algorithm = 'BFS' | 'Dijkstra'
export interface RouteRequest { origin: StationId; destination: StationId }
export interface RoutingOptions { closedStationIds?: ReadonlySet<StationId> }
export interface FrontierEntry { stationId: StationId; priority: number }

/** Ordered, serializable facts about execution; no presentation timing. */
export type AlgorithmEvent =
  | { type: 'start'; algorithm: Algorithm; origin: StationId; destination: StationId }
  | { type: 'current'; stationId: StationId }
  | { type: 'discovered'; stationId: StationId; predecessor: StationId | null }
  | { type: 'visited'; stationId: StationId }
  | { type: 'edge-explored'; connectionId: string; from: StationId; to: StationId }
  | { type: 'frontier'; entries: readonly FrontierEntry[] }
  | { type: 'distance-updated'; stationId: StationId; distance: number; predecessor: StationId | null }
  | { type: 'destination-found'; stationId: StationId }
  | { type: 'path'; stationIds: readonly StationId[]; connectionIds: readonly string[]; travelTime: number }
  | { type: 'complete'; reachable: boolean }

export interface SimulationState {
  currentStation: StationId | null
  discovered: readonly StationId[]
  visited: readonly StationId[]
  exploredConnections: readonly string[]
  frontier: readonly FrontierEntry[]
  distances: Readonly<Record<StationId, number>>
  predecessors: Readonly<Record<StationId, StationId | null>>
  path: readonly StationId[]
  pathConnections: readonly string[]
  travelTime: number | null
  destinationFound: boolean
  complete: boolean
  reachable: boolean | null
}
