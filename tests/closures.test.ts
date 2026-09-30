import assert from 'node:assert/strict'
import test from 'node:test'
import { bfs } from '../src/algorithms/bfs.ts'
import { dijkstra } from '../src/algorithms/dijkstra.ts'
import { network } from '../src/data/network.ts'
import { applyEvent, initialSimulationState } from '../src/hooks/simulationState.ts'
import type { AlgorithmEvent } from '../src/types/graph.ts'

function assertUnavailable(events: readonly AlgorithmEvent[], closed: ReadonlySet<string>) {
  for (const event of events) {
    if ('stationId' in event) assert.ok(!closed.has(event.stationId))
    if (event.type === 'edge-explored') assert.ok(!closed.has(event.from) && !closed.has(event.to))
    if (event.type === 'frontier') assert.ok(event.entries.every(entry => !closed.has(entry.stationId)))
    if (event.type === 'path') assert.ok(event.stationIds.every(id => !closed.has(id)))
  }
}

for (const run of [bfs, dijkstra]) {
  test(`${run.name}: closures cannot be explored and a resilient journey reroutes`, () => {
    const request = { origin: 'apex-central', destination: 'harbor-point' }
    const closed = new Set(['grand-terminal'])
    const events = run(network, request, { closedStationIds: closed })
    assertUnavailable(events, closed)
    const result = events.reduce(applyEvent, initialSimulationState())
    assert.equal(result.reachable, true)
    assert.deepEqual(result.path, ['apex-central', 'nova-square', 'meridian', 'maritime-museum', 'harbor-point'])
    assert.equal(result.travelTime, 20)
  })

  test(`${run.name}: closed endpoints complete as unreachable without discovery`, () => {
    for (const endpoint of ['apex-central', 'harbor-point']) {
      const events = run(network, { origin: 'apex-central', destination: 'harbor-point' }, { closedStationIds: new Set([endpoint]) })
      assert.equal(events.length, 2)
      assert.equal(events[0]?.type, 'start')
      assert.deepEqual(events.at(-1), { type: 'complete', reachable: false })
    }
    assert.deepEqual(run(network, { origin: 'apex-central', destination: 'apex-central' }, { closedStationIds: new Set(['apex-central']) }).at(-1), { type: 'complete', reachable: false })
  })

  test(`${run.name}: isolating an open destination returns no route`, () => {
    const events = run(network, { origin: 'apex-central', destination: 'harbor-point' }, { closedStationIds: new Set(['grand-terminal', 'meridian']) })
    const result = events.reduce(applyEvent, initialSimulationState())
    assert.equal(result.complete, true)
    assert.equal(result.reachable, false)
    assert.deepEqual(result.path, [])
    assert.equal(result.travelTime, null)
  })

  test(`${run.name}: unavailable vertices match physical removal for all remaining station pairs`, () => {
    const closed = new Set(['apex-central', 'grand-terminal'])
    const reduced = {
      ...network,
      stations: network.stations.filter(station => !closed.has(station.id)),
      connections: network.connections.filter(edge => !closed.has(edge.from) && !closed.has(edge.to)),
    }
    for (const origin of reduced.stations) {
      for (const destination of reduced.stations) {
        const request = { origin: origin.id, destination: destination.id }
        assert.deepEqual(run(network, request, { closedStationIds: closed }), run(reduced, request))
      }
    }
  })

  test(`${run.name}: closure/replay is deterministic and never mutates network or options`, () => {
    const before = JSON.stringify(network)
    const closed = new Set(['apex-central'])
    const request = { origin: 'nova-square', destination: 'grand-terminal' }
    const first = run(network, request, { closedStationIds: closed })
    assert.deepEqual(first, run(network, request, { closedStationIds: closed }))
    assertUnavailable(first, closed)
    assert.equal(first.at(-1)?.type, 'complete')
    assert.equal(JSON.stringify(network), before)
    assert.deepEqual([...closed], ['apex-central'])
  })
}
