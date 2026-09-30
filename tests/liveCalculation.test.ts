import test from 'node:test'
import assert from 'node:assert/strict'
import { bfs } from '../src/algorithms/bfs.ts'
import { dijkstra } from '../src/algorithms/dijkstra.ts'
import { deriveLiveCalculation } from '../src/state/liveCalculation.ts'
import { initialPlaybackState, playbackReducer } from '../src/hooks/playbackState.ts'
import { network } from './fixtures/sampleNetwork.ts'
import type { MetroGraph } from '../src/types/graph.ts'

test('BFS calculations use one hop and match real discovery/frontier depths', () => {
  const events = bfs(network, { origin: 'west', destination: 'east' })
  let discoveries = 0
  for (let cursor = 1; cursor <= events.length; cursor++) {
    const event = events[cursor - 1]!
    const calculation = deriveLiveCalculation(network, events, cursor)
    if (event.type !== 'discovered' || event.predecessor === null) continue
    assert.equal(calculation?.algorithm, 'BFS')
    if (calculation?.algorithm !== 'BFS') throw new Error('Missing BFS calculation')
    const next = events[cursor]!
    assert.equal(next.type, 'frontier')
    if (next.type !== 'frontier') throw new Error('Missing frontier')
    assert.equal(calculation.outcome, 'discovered')
    assert.equal(calculation.to, event.stationId)
    assert.equal(calculation.cost, 1)
    assert.equal(calculation.candidate, calculation.current + 1)
    assert.equal(calculation.candidate, next.entries.find(entry => entry.stationId === event.stationId)!.priority)
    discoveries++
  }
  assert.ok(discoveries > 2)
})

test('BFS distinguishes pending discovery and already-known nodes', () => {
  const events = bfs(network, { origin: 'west', destination: 'east' })
  const first = events.findIndex(event => event.type === 'edge-explored')
  assert.equal(deriveLiveCalculation(network, events, first + 1)?.outcome, 'pending')
  const back = events.findIndex(event => event.type === 'edge-explored' && event.to === 'west')
  assert.equal(deriveLiveCalculation(network, events, back + 1)?.outcome, 'known')
})

function triangle(direct: number, alternate: number): MetroGraph {
  return { ...network, connections: [
    { id: 'direct', from: 'west', to: 'east', weight: direct, lineId: 'amber' },
    { id: 'first', from: 'west', to: 'market', weight: 2, lineId: 'amber' },
    { id: 'alternate', from: 'market', to: 'east', weight: alternate, lineId: 'amber' },
  ] }
}

test('Dijkstra uses actual source distance and edge weight; retains previous best after update', () => {
  const graph = triangle(10, 1)
  const events = dijkstra(graph, { origin: 'west', destination: 'east' })
  const index = events.findIndex(event => event.type === 'edge-explored' && event.connectionId === 'alternate')
  const calculation = deriveLiveCalculation(graph, events, index + 1)
  assert.ok(calculation?.algorithm === 'Dijkstra')
  assert.equal(calculation.current, 2)
  assert.equal(calculation.cost, graph.connections[2]!.weight)
  assert.equal(calculation.candidate, 3)
  assert.equal(calculation.previous, 10)
  assert.equal(calculation.outcome, 'update')
  assert.deepEqual(deriveLiveCalculation(graph, events, index + 2), calculation)
  assert.deepEqual(events[index + 1], { type: 'distance-updated', stationId: 'east', distance: 3, predecessor: 'market' })
})

test('Dijkstra keeps both equal and larger candidates', () => {
  for (const weight of [1, 4]) {
    const graph = triangle(3, weight)
    const events = dijkstra(graph, { origin: 'west', destination: 'east' })
    const index = events.findIndex(event => event.type === 'edge-explored' && event.connectionId === 'alternate')
    const calculation = deriveLiveCalculation(graph, events, index + 1)
    assert.ok(calculation?.algorithm === 'Dijkstra')
    assert.equal(calculation.current, 2)
    assert.equal(calculation.candidate, 2 + weight)
    assert.equal(calculation.previous, 3)
    assert.equal(calculation.outcome, 'keep')
    assert.equal(events[index + 1]!.type, 'visited')
  }
})

test('Dijkstra represents unreached targets as infinity', () => {
  const events = dijkstra(network, { origin: 'west', destination: 'east' })
  const index = events.findIndex(event => event.type === 'edge-explored')
  const calculation = deriveLiveCalculation(network, events, index + 1)
  assert.ok(calculation?.algorithm === 'Dijkstra')
  assert.equal(calculation.current, 0)
  assert.equal(calculation.previous, Infinity)
  assert.equal(calculation.candidate, 2)
  assert.equal(calculation.outcome, 'update')
})

test('Dijkstra does not fabricate relaxation for already-settled targets', () => {
  const events = dijkstra(network, { origin: 'west', destination: 'east' })
  const index = events.findIndex(event => event.type === 'edge-explored' && event.to === 'west')
  const calculation = deriveLiveCalculation(network, events, index + 1)
  assert.ok(calculation?.algorithm === 'Dijkstra')
  assert.equal(calculation.outcome, 'settled')
  assert.equal(calculation.candidate, null)
  assert.equal(calculation.previous, 0)
})

test('Calculation projection follows Step, retains Pause, and resets on replay/reroute', () => {
  const events = bfs(network, { origin: 'west', destination: 'east' })
  let playback = playbackReducer(initialPlaybackState(), { type: 'load', events, runId: 1, autoPlay: true })
  const edgeIndex = events.findIndex(event => event.type === 'edge-explored')
  for (let i = 0; i <= edgeIndex; i++) playback = playbackReducer(playback, { type: 'step' })
  const calculation = deriveLiveCalculation(network, playback.events, playback.cursor)
  assert.ok(calculation)
  playback = playbackReducer(playback, { type: 'pause' })
  playback = playbackReducer(playback, { type: 'tick', runId: 1, cursor: playback.cursor })
  assert.deepEqual(deriveLiveCalculation(network, playback.events, playback.cursor), calculation)
  playback = playbackReducer(playback, { type: 'reset' })
  assert.equal(deriveLiveCalculation(network, playback.events, playback.cursor), null)
  for (let i = 0; i <= edgeIndex; i++) playback = playbackReducer(playback, { type: 'step' })
  assert.deepEqual(deriveLiveCalculation(network, playback.events, playback.cursor), calculation)
  const closed = bfs(network, { origin: 'west', destination: 'east' }, { closedStationIds: new Set(['west']) })
  assert.equal(deriveLiveCalculation(network, closed, closed.length), null)
})
