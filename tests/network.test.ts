import assert from 'node:assert/strict'
import test from 'node:test'
import { bfs } from '../src/algorithms/bfs.ts'
import { dijkstra } from '../src/algorithms/dijkstra.ts'
import { network } from '../src/data/network.ts'
import type { AlgorithmEvent, MetroGraph, RouteRequest, Station } from '../src/types/graph.ts'

const graph: MetroGraph = network
const demoRoute = { origin: 'apex-central', destination: 'harbor-point' }
type Path = Extract<AlgorithmEvent, { type: 'path' }>

function route(run: typeof bfs, source: MetroGraph, request: RouteRequest): Path {
  const events = run(source, request)
  assert.deepEqual(events.at(-1), { type: 'complete', reachable: true })
  const path = events.find(event => event.type === 'path')
  assert.ok(path, `${request.origin} → ${request.destination} must be reachable`)
  assert.equal(path.stationIds[0], request.origin)
  assert.equal(path.stationIds.at(-1), request.destination)
  assert.equal(path.connectionIds.length, path.stationIds.length - 1)
  assert.equal(new Set(path.stationIds).size, path.stationIds.length)
  let minutes = 0
  for (const [index, id] of path.connectionIds.entries()) {
    const edge = source.connections.find(connection => connection.id === id)
    assert.ok(edge, `Unknown route connection: ${id}`)
    const from: string | undefined = path.stationIds[index]
    const to: string | undefined = path.stationIds[index + 1]
    assert.ok((edge.from === from && edge.to === to) || (edge.to === from && edge.from === to))
    minutes += edge.weight
  }
  assert.equal(path.travelTime, minutes)
  return path
}

/** Independent Floyd–Warshall oracle for both hop-count and time optimality. */
function shortestDistances(source: MetroGraph, weighted: boolean) {
  const ids = source.stations.map(station => station.id)
  const distance = ids.map((_, i) => ids.map((__, j) => i === j ? 0 : Infinity))
  for (const edge of source.connections) {
    const from = ids.indexOf(edge.from)
    const to = ids.indexOf(edge.to)
    distance[from]![to] = distance[to]![from] = weighted ? edge.weight : 1
  }
  for (let k = 0; k < ids.length; k++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = 0; j < ids.length; j++) {
        distance[i]![j] = Math.min(distance[i]![j]!, distance[i]![k]! + distance[k]![j]!)
      }
    }
  }
  return distance
}

test('network has exactly 24 unique stations, 3 lines, 4 interchanges and 25 unique connections', () => {
  assert.equal(graph.stations.length, 24)
  assert.equal(new Set(graph.stations.map(station => station.id)).size, 24)
  assert.equal(new Set(graph.stations.map(station => station.name)).size, 24)
  assert.equal(graph.lines.length, 3)
  assert.deepEqual(graph.lines.map(line => line.id), ['azure', 'emerald', 'amber'])
  assert.equal(graph.connections.length, 25)
  assert.equal(new Set(graph.connections.map(edge => edge.id)).size, 25)
  // Detect reversed duplicates as well as repeated records, regardless of line.
  assert.equal(new Set(graph.connections.map(edge => [edge.from, edge.to].sort().join('|'))).size, 25)
  assert.deepEqual(graph.stations.filter(station => station.isInterchange).map(station => station.id), ['apex-central', 'meridian', 'grand-terminal', 'harbor-point'])
})

test('references, positive integer weights and station line memberships agree', () => {
  const stations = new Map(graph.stations.map(station => [station.id, station]))
  const lines = new Set(graph.lines.map(line => line.id))
  for (const edge of graph.connections) {
    assert.ok(stations.has(edge.from) && stations.has(edge.to))
    assert.notEqual(edge.from, edge.to)
    assert.ok(lines.has(edge.lineId))
    assert.ok(Number.isFinite(edge.weight) && Number.isInteger(edge.weight) && edge.weight > 0)
    assert.ok(edge.weight >= 2 && edge.weight <= 8)
  }
  for (const station of graph.stations) {
    assert.equal(new Set(station.lineIds).size, station.lineIds.length)
    assert.ok(station.lineIds.every(id => lines.has(id)))
    assert.equal(station.isInterchange, station.lineIds.length > 1)
    const incidentLines = new Set(graph.connections.filter(edge => edge.from === station.id || edge.to === station.id).map(edge => edge.lineId))
    assert.deepEqual(new Set(station.lineIds), incidentLines)
  }
})

test('each metro line is a continuous unbranched service', () => {
  for (const line of graph.lines) {
    const service: MetroGraph = {
      lines: [line],
      stations: graph.stations.filter(station => station.lineIds.includes(line.id)),
      connections: graph.connections.filter(edge => edge.lineId === line.id),
    }
    const degrees = service.stations.map(station => service.connections.filter(edge => edge.from === station.id || edge.to === station.id).length)
    assert.equal(degrees.filter(degree => degree === 1).length, 2)
    assert.ok(degrees.every(degree => degree === 1 || degree === 2))
    assert.ok(shortestDistances(service, false).every(row => row.every(Number.isFinite)))
  }
})

test('normal network is connected and has two independent cycles', () => {
  assert.ok(shortestDistances(graph, false).every(row => row.every(Number.isFinite)))
  assert.equal(graph.connections.length - graph.stations.length + 1, 2)
})

test('both algorithms return valid optimal routes for all 576 ordered station pairs', () => {
  const hops = shortestDistances(graph, false)
  const minutes = shortestDistances(graph, true)
  for (const [i, origin] of graph.stations.entries()) {
    for (const [j, destination] of graph.stations.entries()) {
      const request = { origin: origin.id, destination: destination.id }
      assert.equal(route(bfs, graph, request).connectionIds.length, hops[i]![j])
      assert.equal(route(dijkstra, graph, request).travelTime, minutes[i]![j])
    }
  }
})

const comparisons = [
  {
    origin: 'apex-central', destination: 'meridian',
    bfsPath: ['apex-central', 'nova-square', 'meridian'], bfsMinutes: 16,
    fastestPath: ['apex-central', 'riverside', 'grand-terminal', 'arena', 'docklands', 'harbor-point', 'maritime-museum', 'meridian'], fastestMinutes: 14,
  },
  {
    origin: 'grand-terminal', destination: 'harbor-point',
    bfsPath: ['grand-terminal', 'canal-street', 'harbor-point'], bfsMinutes: 16,
    fastestPath: ['grand-terminal', 'arena', 'docklands', 'harbor-point'], fastestMinutes: 6,
  },
  {
    ...demoRoute,
    bfsPath: ['apex-central', 'nova-square', 'meridian', 'maritime-museum', 'harbor-point'], bfsMinutes: 20,
    fastestPath: ['apex-central', 'riverside', 'grand-terminal', 'arena', 'docklands', 'harbor-point'], fastestMinutes: 10,
  },
]

for (const example of comparisons) {
  test(`fewest stops differs from fastest route: ${example.origin} → ${example.destination}`, () => {
    const fewest = route(bfs, graph, example)
    const fastest = route(dijkstra, graph, example)
    assert.deepEqual(fewest.stationIds, example.bfsPath)
    assert.deepEqual(fastest.stationIds, example.fastestPath)
    assert.equal(fewest.travelTime, example.bfsMinutes)
    assert.equal(fastest.travelTime, example.fastestMinutes)
    assert.ok(fewest.connectionIds.length < fastest.connectionIds.length)
    assert.ok(fastest.travelTime < fewest.travelTime)
    assert.notDeepEqual(fewest.stationIds, fastest.stationIds)
  })
}

for (const example of [
  { removed: 'apex-central', origin: 'nova-square', destination: 'grand-terminal', path: ['nova-square', 'meridian', 'maritime-museum', 'harbor-point', 'docklands', 'arena', 'grand-terminal'], minutes: 18 },
  { removed: 'grand-terminal', ...demoRoute, path: ['apex-central', 'nova-square', 'meridian', 'maritime-museum', 'harbor-point'], minutes: 20 },
]) {
  test(`removing ${example.removed} preserves a genuine alternate major-station route`, () => {
    assert.ok(graph.stations.find(station => station.id === example.removed)?.isInterchange)
    assert.ok(route(dijkstra, graph, example).stationIds.includes(example.removed))
    // Removal is a test fixture only; there is no application closure feature.
    const reduced: MetroGraph = {
      ...graph,
      stations: graph.stations.filter(station => station.id !== example.removed),
      connections: graph.connections.filter(edge => edge.from !== example.removed && edge.to !== example.removed),
    }
    for (const run of [bfs, dijkstra]) {
      const alternate = route(run, reduced, example)
      assert.ok(!alternate.stationIds.includes(example.removed))
      route(run, reduced, { origin: example.destination, destination: example.origin })
    }
    const fastest = route(dijkstra, reduced, example)
    assert.deepEqual(fastest.stationIds, example.path)
    assert.equal(fastest.travelTime, example.minutes)
  })
}

test('schematic geometry uses unique positions, orthogonal/45-degree segments and no hidden crossings', () => {
  const stations = new Map(graph.stations.map(station => [station.id, station]))
  assert.equal(new Set(graph.stations.map(station => `${station.x},${station.y}`)).size, 24)
  for (const station of graph.stations) assert.ok(Number.isFinite(station.x) && Number.isFinite(station.y))
  const segments = graph.connections.map(edge => ({ edge, a: stations.get(edge.from)!, b: stations.get(edge.to)! }))
  const orientation = (a: Station, b: Station, c: Station) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x))
  for (const [i, { edge, a, b }] of segments.entries()) {
    assert.ok(a.x === b.x || a.y === b.y || Math.abs(a.x - b.x) === Math.abs(a.y - b.y), edge.id)
    for (const { edge: other, a: c, b: d } of segments.slice(i + 1)) {
      if ([edge.from, edge.to].some(id => id === other.from || id === other.to)) continue
      const boxesOverlap = Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <= Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x))
        && Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <= Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y))
      const intersects = boxesOverlap && orientation(a, b, c) * orientation(a, b, d) <= 0 && orientation(c, d, a) * orientation(c, d, b) <= 0
      assert.ok(!intersects, `Unmarked crossing: ${edge.id} / ${other.id}`)
    }
  }
})
