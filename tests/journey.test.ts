import assert from 'node:assert/strict'
import test from 'node:test'
import { initialJourneyState, journeyReducer } from '../src/state/journey.ts'
import type { JourneyState } from '../src/state/journey.ts'

function configured(): JourneyState {
  let state = journeyReducer(initialJourneyState(), { type: 'intro-complete' })
  state = journeyReducer(state, { type: 'select-station', stationId: 'apex-central' })
  return journeyReducer(state, { type: 'select-station', stationId: 'harbor-point' })
}

test('intro → origin → destination → configure waits for explicit visualization', () => {
  let state = initialJourneyState()
  assert.equal(state.journey.phase, 'INTRO')
  state = journeyReducer(state, { type: 'intro-complete' })
  assert.equal(state.journey.phase, 'SELECT_ORIGIN')
  state = journeyReducer(state, { type: 'select-station', stationId: 'apex-central' })
  assert.equal(state.journey.phase, 'SELECT_DESTINATION')
  state = journeyReducer(state, { type: 'select-station', stationId: 'harbor-point' })
  assert.equal(state.journey.phase, 'CONFIGURE')
  assert.equal(state.run, null)
  state = journeyReducer(state, { type: 'set-algorithm', algorithm: 'Dijkstra' })
  assert.equal(state.run, null)
  state = journeyReducer(state, { type: 'visualize' })
  assert.equal(state.journey.phase, 'SIMULATING')
  assert.equal(state.run?.algorithm, 'Dijkstra')
  state = journeyReducer(state, { type: 'complete', runId: state.run!.id })
  assert.equal(state.journey.phase, 'RESULT')
})

test('origin cannot equal destination', () => {
  let state = journeyReducer(configured(), { type: 'change-destination' })
  state = journeyReducer(state, { type: 'select-station', stationId: 'apex-central' })
  assert.equal(state.journey.phase, 'SELECT_DESTINATION')
  assert.equal(state.journey.destination, null)
  assert.ok(state.notice?.includes('different'))
})

test('closed stations cannot be selected as origin or destination', () => {
  let state = journeyReducer(configured(), { type: 'new-journey' })
  state = journeyReducer(state, { type: 'toggle-closure', stationId: 'harbor-point' })
  state = journeyReducer(state, { type: 'select-station', stationId: 'harbor-point' })
  assert.equal(state.journey.origin, null)
  state = journeyReducer(state, { type: 'select-station', stationId: 'apex-central' })
  state = journeyReducer(state, { type: 'select-station', stationId: 'harbor-point' })
  assert.equal(state.journey.destination, null)
})

test('reset preserves endpoints and algorithm; new journey clears endpoints without intro', () => {
  let state = journeyReducer(configured(), { type: 'set-algorithm', algorithm: 'Dijkstra' })
  state = journeyReducer(state, { type: 'visualize' })
  state = journeyReducer(state, { type: 'reset' })
  assert.deepEqual(state.journey, { phase: 'CONFIGURE', origin: 'apex-central', destination: 'harbor-point' })
  assert.equal(state.algorithm, 'Dijkstra')
  assert.equal(state.run, null)
  state = journeyReducer(state, { type: 'new-journey' })
  assert.deepEqual(state.journey, { phase: 'SELECT_ORIGIN', origin: null, destination: null })
  assert.equal(journeyReducer(state, { type: 'intro-complete' }), state)
})

test('change origin starts selection again, while change destination retains origin', () => {
  assert.deepEqual(journeyReducer(configured(), { type: 'change-destination' }).journey, { phase: 'SELECT_DESTINATION', origin: 'apex-central', destination: null })
  assert.deepEqual(journeyReducer(configured(), { type: 'change-origin' }).journey, { phase: 'SELECT_ORIGIN', origin: null, destination: null })
})

test('disruption mode toggles closures instead of selecting stations', () => {
  let state = journeyReducer(initialJourneyState(), { type: 'intro-complete' })
  state = journeyReducer(state, { type: 'set-mode', mode: 'disruptions' })
  state = journeyReducer(state, { type: 'select-station', stationId: 'grand-terminal' })
  assert.deepEqual(state.closedStationIds, ['grand-terminal'])
  assert.equal(state.journey.origin, null)
  state = journeyReducer(state, { type: 'select-station', stationId: 'grand-terminal' })
  assert.deepEqual(state.closedStationIds, [])
})

test('closing an origin during destination selection returns to origin selection', () => {
  const selecting = journeyReducer(configured(), { type: 'change-destination' })
  const state = journeyReducer(selecting, { type: 'toggle-closure', stationId: 'apex-central' })
  assert.equal(state.journey.phase, 'SELECT_ORIGIN')
  assert.equal(state.run, null)
})

test('configured and completed journeys restart on disruption without mutating an old run', () => {
  let state = journeyReducer(configured(), { type: 'toggle-closure', stationId: 'grand-terminal' })
  assert.equal(state.journey.phase, 'SIMULATING')
  assert.equal(state.run?.reason, 'disruption')
  assert.deepEqual(state.run?.closedStationIds, ['grand-terminal'])
  const first = state.run!
  state = journeyReducer(state, { type: 'complete', runId: first.id })
  state = journeyReducer(state, { type: 'toggle-closure', stationId: 'meridian' })
  assert.equal(state.journey.phase, 'SIMULATING')
  assert.ok(state.run!.id > first.id)
  assert.deepEqual(first.closedStationIds, ['grand-terminal'])
  assert.deepEqual(state.run?.closedStationIds, ['grand-terminal', 'meridian'])
  assert.equal(journeyReducer(state, { type: 'complete', runId: first.id }), state)
})

test('restoration reruns the selected journey, and new journey preserves disruptions', () => {
  let state = journeyReducer(configured(), { type: 'toggle-closure', stationId: 'grand-terminal' })
  state = journeyReducer(state, { type: 'toggle-closure', stationId: 'meridian' })
  state = journeyReducer(state, { type: 'restore-station', stationId: 'grand-terminal' })
  assert.deepEqual(state.closedStationIds, ['meridian'])
  assert.deepEqual(state.run?.closedStationIds, ['meridian'])
  const fresh = journeyReducer(state, { type: 'new-journey' })
  assert.deepEqual(fresh.closedStationIds, ['meridian'])
  state = journeyReducer(state, { type: 'restore-all' })
  assert.deepEqual(state.closedStationIds, [])
  assert.deepEqual(state.run?.closedStationIds, [])
})

test('replay snapshots the same journey with a fresh run ID and bypasses intro', () => {
  let state = journeyReducer(configured(), { type: 'visualize' })
  const first = state.run!
  state = journeyReducer(state, { type: 'complete', runId: first.id })
  state = journeyReducer(state, { type: 'replay' })
  assert.equal(state.journey.phase, 'SIMULATING')
  assert.equal(state.run?.origin, first.origin)
  assert.equal(state.run?.destination, first.destination)
  assert.equal(state.run?.algorithm, first.algorithm)
  assert.ok(state.run!.id > first.id)
})
