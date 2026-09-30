import type { AlgorithmEvent, SimulationState } from '../types/graph.ts'

export function initialSimulationState(): SimulationState {
  return { currentStation: null, discovered: [], visited: [], exploredConnections: [], frontier: [], distances: {}, predecessors: {}, path: [], pathConnections: [], travelTime: null, destinationFound: false, complete: false, reachable: null }
}

export function applyEvent(state: SimulationState, event: AlgorithmEvent): SimulationState {
  switch (event.type) {
    case 'start': return initialSimulationState()
    case 'current': return { ...state, currentStation: event.stationId }
    case 'discovered': return { ...state, discovered: [...state.discovered, event.stationId], predecessors: { ...state.predecessors, [event.stationId]: event.predecessor } }
    case 'visited': return { ...state, visited: [...state.visited, event.stationId] }
    case 'edge-explored': return { ...state, exploredConnections: [...new Set([...state.exploredConnections, event.connectionId])] }
    case 'frontier': return { ...state, frontier: event.entries }
    case 'distance-updated': return { ...state, distances: { ...state.distances, [event.stationId]: event.distance }, predecessors: { ...state.predecessors, [event.stationId]: event.predecessor } }
    case 'destination-found': return { ...state, destinationFound: true }
    case 'path': return { ...state, path: event.stationIds, pathConnections: event.connectionIds, travelTime: event.travelTime }
    case 'complete': return { ...state, complete: true, reachable: event.reachable, currentStation: null }
  }
}
