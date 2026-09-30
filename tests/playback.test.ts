import assert from 'node:assert/strict'
import test from 'node:test'
import { bfs } from '../src/algorithms/bfs.ts'
import { dijkstra } from '../src/algorithms/dijkstra.ts'
import { network } from '../src/data/network.ts'
import { initialPlaybackState, playbackReducer } from '../src/hooks/playbackState.ts'
import type { PlaybackSpeed } from '../src/hooks/playbackState.ts'
import { applyEvent, initialSimulationState } from '../src/hooks/simulationState.ts'
import { countTransfers } from '../src/state/routeSummary.ts'

for (const run of [bfs, dijkstra]) {
  const events = run(network, { origin: 'apex-central', destination: 'harbor-point' })
  test(`${run.name}: Step consumes exactly one event and matches every replay prefix`, () => {
    let state = playbackReducer(initialPlaybackState(), { type: 'load', events, runId: 1, autoPlay: true })
    for (let cursor = 1; cursor <= events.length; cursor++) {
      state = playbackReducer(state, { type: 'step' })
      assert.equal(state.cursor, cursor)
      assert.equal(state.isPlaying, false)
      assert.deepEqual(state.simulation, events.slice(0, cursor).reduce(applyEvent, initialSimulationState()))
    }
    assert.equal(playbackReducer(state, { type: 'step' }).cursor, events.length)
  })

  test(`${run.name}: all playback speeds produce identical states and results`, () => {
    for (const speed of [0.5, 1, 2] satisfies PlaybackSpeed[]) {
      let state = playbackReducer(initialPlaybackState(), { type: 'load', events, runId: 1, autoPlay: true })
      state = playbackReducer(state, { type: 'speed', speed })
      for (let cursor = 0; cursor < events.length; cursor++) state = playbackReducer(state, { type: 'tick', runId: 1, cursor })
      assert.equal(state.cursor, events.length)
      assert.equal(state.isPlaying, false)
      assert.deepEqual(state.simulation, events.reduce(applyEvent, initialSimulationState()))
    }
  })

  test(`${run.name}: pause blocks ticks; play resumes; stale ticks cannot advance a reroute`, () => {
    let state = playbackReducer(initialPlaybackState(), { type: 'load', events, runId: 1, autoPlay: true })
    state = playbackReducer(state, { type: 'pause' })
    assert.equal(playbackReducer(state, { type: 'tick', runId: 1, cursor: 0 }), state)
    state = playbackReducer(state, { type: 'play' })
    state = playbackReducer(state, { type: 'tick', runId: 1, cursor: 0 })
    assert.equal(state.cursor, 1)
    assert.equal(playbackReducer(state, { type: 'tick', runId: 1, cursor: 0 }), state)
    state = playbackReducer(state, { type: 'load', events, runId: 2, autoPlay: true })
    assert.equal(playbackReducer(state, { type: 'tick', runId: 1, cursor: 0 }), state)
  })

  test(`${run.name}: reset clears traversal and deterministic replay retains loaded events`, () => {
    let state = playbackReducer(initialPlaybackState(), { type: 'load', events, runId: 1, autoPlay: true })
    state = playbackReducer(state, { type: 'step' })
    state = playbackReducer(state, { type: 'reset' })
    assert.equal(state.cursor, 0)
    assert.equal(state.isPlaying, false)
    assert.deepEqual(state.simulation, initialSimulationState())
    assert.deepEqual(state.events, events)
    while (state.cursor < events.length) state = playbackReducer(state, { type: 'step' })
    assert.deepEqual(state.simulation, events.reduce(applyEvent, initialSimulationState()))
  })
}

test('transfers count actual connection-line changes, not interchange stations', () => {
  assert.equal(countTransfers(network, ['az-04', 'az-05', 'am-06', 'am-05']), 1)
  assert.equal(countTransfers(network, ['em-04', 'em-05', 'em-06', 'em-07', 'em-08']), 0)
  assert.equal(countTransfers(network, []), 0)
})
