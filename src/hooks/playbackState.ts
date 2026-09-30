import type { AlgorithmEvent, SimulationState } from '../types/graph.ts'
import { applyEvent, initialSimulationState } from './simulationState.ts'

export type PlaybackSpeed = 0.5 | 1 | 2
export interface PlaybackState {
  events: readonly AlgorithmEvent[]
  cursor: number
  runId: number
  isPlaying: boolean
  speed: PlaybackSpeed
  simulation: SimulationState
}
export type PlaybackAction =
  | { type: 'load'; events: readonly AlgorithmEvent[]; runId: number; autoPlay: boolean }
  | { type: 'play' | 'pause' | 'step' | 'reset' }
  | { type: 'tick'; runId: number; cursor: number }
  | { type: 'speed'; speed: PlaybackSpeed }

export function initialPlaybackState(): PlaybackState {
  return { events: [], cursor: 0, runId: 0, isPlaying: false, speed: 1, simulation: initialSimulationState() }
}

function advance(state: PlaybackState, playing: boolean): PlaybackState {
  const event = state.events[state.cursor]
  if (!event) return { ...state, isPlaying: false }
  const cursor = state.cursor + 1
  return { ...state, cursor, simulation: applyEvent(state.simulation, event), isPlaying: playing && cursor < state.events.length }
}

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'load': return { ...initialPlaybackState(), events: [...action.events], runId: action.runId, speed: state.speed, isPlaying: action.autoPlay && action.events.length > 0 }
    case 'play': return { ...state, isPlaying: state.cursor < state.events.length }
    case 'pause': return { ...state, isPlaying: false }
    case 'step': return advance(state, false)
    case 'reset': return { ...state, cursor: 0, isPlaying: false, simulation: initialSimulationState() }
    case 'speed': return { ...state, speed: action.speed }
    case 'tick': return state.isPlaying && action.runId === state.runId && action.cursor === state.cursor ? advance(state, true) : state
  }
}

/** Readability timing only; it never changes the algorithm event order. */
export function eventDuration(event: AlgorithmEvent | null): number {
  switch (event?.type) {
    case 'edge-explored': return 600
    case 'current': return 320
    case 'distance-updated': return 220
    case 'path': return 400
    default: return 100
  }
}
