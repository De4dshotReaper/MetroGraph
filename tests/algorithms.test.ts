import assert from 'node:assert/strict'
import test from 'node:test'
import { bfs } from '../src/algorithms/bfs.ts'
import { dijkstra } from '../src/algorithms/dijkstra.ts'
import { network } from './fixtures/sampleNetwork.ts'
import { applyEvent, initialSimulationState } from '../src/hooks/simulationState.ts'
import type { MetroGraph } from '../src/types/graph.ts'

const request = { origin: 'west', destination: 'east' }

test('BFS minimizes connections; Dijkstra minimizes travel time', () => {
  const breadth = bfs(network, request).find(event => event.type === 'path')!
  const weighted = dijkstra(network, request).find(event => event.type === 'path')!
  assert.deepEqual(breadth.stationIds, ['west', 'market', 'central', 'east'])
  assert.equal(breadth.travelTime, 12)
  assert.deepEqual(weighted.stationIds, ['west', 'market', 'central', 'south', 'east'])
  assert.equal(weighted.travelTime, 8)
})

for (const run of [bfs, dijkstra]) {
  test(`${run.name}: deterministic events, replay and predecessor reconstruction`, () => {
    const before = JSON.stringify(network)
    const events = run(network, request)
    assert.deepEqual(events, run(network, request))
    assert.equal(JSON.stringify(network), before)
    assert.equal(events[0]?.type, 'start')
    assert.deepEqual(events.at(-1), { type: 'complete', reachable: true })
    const state = events.reduce(applyEvent, initialSimulationState())
    assert.equal(state.complete, true)
    assert.equal(state.destinationFound, true)
    assert.equal(new Set(state.visited).size, state.visited.length)
    for (let i = 1; i < state.path.length; i++) {
      assert.equal(state.predecessors[state.path[i]!], state.path[i - 1])
    }
    assert.deepEqual(events.reduce(applyEvent, state), state)
  })

  test(`${run.name}: origin equals destination`, () => {
    const state = run(network, { origin: 'west', destination: 'west' }).reduce(applyEvent, initialSimulationState())
    assert.deepEqual(state.path, ['west'])
    assert.equal(state.travelTime, 0)
  })

  test(`${run.name}: disconnected destination and bidirectional edges`, () => {
    const disconnected = { ...network, connections: [] }
    assert.deepEqual(run(disconnected, request).at(-1), { type: 'complete', reachable: false })
    assert.deepEqual(run(network, { origin: 'east', destination: 'west' }).at(-1), { type: 'complete', reachable: true })
  })

  test(`${run.name}: invalid station and invalid weights fail early`, () => {
    assert.throws(() => run(network, { origin: 'missing', destination: 'east' }))
    for (const weight of [-1, Infinity, NaN]) {
      assert.throws(() => run({ ...network, connections: [{ ...network.connections[0], weight }] }, request))
    }
  })
}

test('Dijkstra improves a discovered distance and handles zero-weight cycles', () => {
  const graph: MetroGraph = {
    ...network,
    connections: [
      { id: 'a', from: 'west', to: 'east', weight: 10, lineId: 'amber' },
      { id: 'b', from: 'west', to: 'market', weight: 0, lineId: 'amber' },
      { id: 'c', from: 'market', to: 'central', weight: 0, lineId: 'amber' },
      { id: 'd', from: 'central', to: 'west', weight: 0, lineId: 'amber' },
      { id: 'e', from: 'central', to: 'east', weight: 1, lineId: 'amber' },
    ],
  }
  const events = dijkstra(graph, request)
  assert.deepEqual(events.flatMap(event => event.type === 'distance-updated' && event.stationId === 'east' ? [event.distance] : []), [10, 1])
  const state = events.reduce(applyEvent, initialSimulationState())
  assert.equal(state.travelTime, 1)
  assert.deepEqual(state.pathConnections, ['d', 'e'])
})
