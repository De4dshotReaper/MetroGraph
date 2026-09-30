import type { Algorithm, RouteRequest, StationId } from '../types/graph.ts'

export type Journey =
  | { phase: 'INTRO' | 'SELECT_ORIGIN'; origin: null; destination: null }
  | { phase: 'SELECT_DESTINATION'; origin: StationId; destination: null }
  | ({ phase: 'CONFIGURE' | 'SIMULATING' | 'RESULT' } & RouteRequest)

export interface SimulationRun extends RouteRequest {
  id: number
  algorithm: Algorithm
  closedStationIds: readonly StationId[]
  reason: 'visualize' | 'replay' | 'disruption'
}

export interface JourneyState {
  journey: Journey
  algorithm: Algorithm
  mode: 'journey' | 'disruptions'
  closedStationIds: readonly StationId[]
  run: SimulationRun | null
  revision: number
  notice: string | null
}

export type JourneyAction =
  | { type: 'intro-complete' }
  | { type: 'select-station'; stationId: StationId }
  | { type: 'set-mode'; mode: JourneyState['mode'] }
  | { type: 'set-algorithm'; algorithm: Algorithm }
  | { type: 'visualize' | 'replay' | 'reset' | 'new-journey' | 'change-origin' | 'change-destination' | 'restore-all' }
  | { type: 'complete'; runId: number }
  | { type: 'toggle-closure' | 'restore-station'; stationId: StationId }

export function initialJourneyState(): JourneyState {
  return { journey: { phase: 'INTRO', origin: null, destination: null }, algorithm: 'BFS', mode: 'journey', closedStationIds: [], run: null, revision: 0, notice: null }
}

function startRun(state: JourneyState, reason: SimulationRun['reason']): JourneyState {
  const { origin, destination } = state.journey
  if (origin === null || destination === null) return state
  const id = state.revision + 1
  return {
    ...state, revision: id, journey: { phase: 'SIMULATING', origin, destination },
    run: { id, origin, destination, algorithm: state.algorithm, closedStationIds: [...state.closedStationIds], reason },
    notice: reason === 'disruption' ? 'Route disrupted. Recalculating with the current network…' : null,
  }
}

function updateClosures(state: JourneyState, closedStationIds: readonly StationId[]): JourneyState {
  const next = { ...state, closedStationIds }
  if (state.journey.phase === 'SELECT_DESTINATION' && closedStationIds.includes(state.journey.origin)) {
    return { ...next, journey: { phase: 'SELECT_ORIGIN', origin: null, destination: null }, notice: 'Your origin is closed. Select another operational station.' }
  }
  // Any operational change may invalidate or improve a route. Restart an active
  // journey, including paused/configured journeys, rather than showing stale data.
  return startRun(next, 'disruption')
}

export function journeyReducer(state: JourneyState, action: JourneyAction): JourneyState {
  const { journey } = state
  switch (action.type) {
    case 'intro-complete':
      return journey.phase === 'INTRO' ? { ...state, journey: { phase: 'SELECT_ORIGIN', origin: null, destination: null } } : state
    case 'set-mode': return { ...state, mode: action.mode }
    case 'select-station': {
      if (state.mode === 'disruptions') return journeyReducer(state, { type: 'toggle-closure', stationId: action.stationId })
      if (state.closedStationIds.includes(action.stationId)) return { ...state, notice: 'That station is closed. Select an operational station.' }
      if (journey.phase === 'SELECT_ORIGIN') return { ...state, notice: null, journey: { phase: 'SELECT_DESTINATION', origin: action.stationId, destination: null } }
      if (journey.phase !== 'SELECT_DESTINATION') return state
      if (action.stationId === journey.origin) return { ...state, notice: 'Choose a destination different from your origin.' }
      return { ...state, notice: null, journey: { phase: 'CONFIGURE', origin: journey.origin, destination: action.stationId } }
    }
    case 'set-algorithm': return journey.phase === 'CONFIGURE' ? { ...state, algorithm: action.algorithm } : state
    case 'visualize': return journey.phase === 'CONFIGURE' ? startRun(state, 'visualize') : state
    case 'replay': return journey.phase === 'RESULT' ? startRun(state, 'replay') : state
    case 'complete':
      return journey.phase === 'SIMULATING' && action.runId === state.run?.id
        ? { ...state, journey: { ...journey, phase: 'RESULT' }, notice: state.run.reason === 'disruption' ? 'Route recalculated with the current network.' : null } : state
    case 'reset':
      return journey.phase === 'SIMULATING' || journey.phase === 'RESULT'
        ? { ...state, journey: { ...journey, phase: 'CONFIGURE' }, run: null, notice: null } : state
    case 'new-journey':
    case 'change-origin':
      return { ...state, journey: { phase: 'SELECT_ORIGIN', origin: null, destination: null }, mode: 'journey', run: null, notice: null }
    case 'change-destination':
      return journey.origin !== null
        ? { ...state, journey: { phase: 'SELECT_DESTINATION', origin: journey.origin, destination: null }, mode: 'journey', run: null, notice: null } : state
    case 'toggle-closure':
      return updateClosures(state, state.closedStationIds.includes(action.stationId)
        ? state.closedStationIds.filter(id => id !== action.stationId) : [...state.closedStationIds, action.stationId])
    case 'restore-station':
      return state.closedStationIds.includes(action.stationId) ? updateClosures(state, state.closedStationIds.filter(id => id !== action.stationId)) : state
    case 'restore-all': return state.closedStationIds.length ? updateClosures(state, []) : state
  }
}
