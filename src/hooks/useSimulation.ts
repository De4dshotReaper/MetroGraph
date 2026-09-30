import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { AlgorithmEvent } from '../types/graph.ts'
import { eventDuration, initialPlaybackState, playbackReducer } from './playbackState.ts'
import type { PlaybackSpeed } from './playbackState.ts'

export function useSimulation() {
  const [playback, dispatch] = useReducer(playbackReducer, undefined, initialPlaybackState)
  const { events, cursor, runId, isPlaying, speed, simulation: state } = playback
  const currentEvent = events[cursor - 1] ?? null
  const duration = eventDuration(currentEvent)
  const clock = useRef({ runId, cursor, elapsed: 0 })
  const loadEvents = useCallback((next: readonly AlgorithmEvent[], id = 0, autoPlay = false) => dispatch({ type: 'load', events: next, runId: id, autoPlay }), [])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])
  const pause = useCallback(() => dispatch({ type: 'pause' }), [])
  const play = useCallback(() => dispatch({ type: 'play' }), [])
  const step = useCallback(() => dispatch({ type: 'step' }), [])
  const setPlaybackSpeed = useCallback((next: PlaybackSpeed) => dispatch({ type: 'speed', speed: next }), [])

  // Retain elapsed base time across pause and speed changes. Stale timer callbacks
  // carry their run/cursor so the pure reducer can reject them after reset/reroute.
  useEffect(() => {
    if (clock.current.runId !== runId || clock.current.cursor !== cursor) clock.current = { runId, cursor, elapsed: 0 }
    if (!isPlaying) return
    const started = performance.now()
    const timer = window.setTimeout(() => dispatch({ type: 'tick', runId, cursor }), Math.max(0, duration - clock.current.elapsed) / speed)
    return () => {
      window.clearTimeout(timer)
      clock.current.elapsed += (performance.now() - started) * speed
    }
  }, [isPlaying, cursor, runId, duration, speed])

  return { state, events, cursor, runId, eventCount: events.length, currentEvent, duration, isPlaying, speed, loadEvents, play, pause, step, reset, setPlaybackSpeed }
}
