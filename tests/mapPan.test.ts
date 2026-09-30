import test from 'node:test'
import assert from 'node:assert/strict'
import { panPosition } from '../src/state/mapPan.ts'

const start = { x: 100, y: 100, left: 200, top: 150 }
test('Map taps tolerate small pointer jitter; deliberate drags cross the threshold', () => {
  assert.equal(panPosition(start, 103, 102, 600, 400).moved, false)
  assert.equal(panPosition(start, 106, 100, 600, 400).moved, true)
  assert.equal(panPosition(start, 104, 105, 600, 400).moved, true)
})
test('Map panning follows pointer movement in both axes', () => {
  assert.deepEqual(panPosition(start, 140, 70, 600, 400), { moved: true, left: 160, top: 180 })
})
test('Map panning stays within canvas bounds including an undersized canvas', () => {
  assert.deepEqual(panPosition(start, -1000, -1000, 600, 400), { moved: true, left: 600, top: 400 })
  assert.deepEqual(panPosition(start, 1000, 1000, 600, 400), { moved: true, left: 0, top: 0 })
  assert.deepEqual(panPosition(start, 80, 70, -50, 0), { moved: true, left: 0, top: 0 })
})

import { MapGesture, pinchCamera, clampCamera, MIN_ZOOM, MAX_ZOOM } from '../src/state/mapPan.ts'
const bounds = { width: 390, height: 300, canvasWidth: 928, canvasHeight: 640 }
const camera = { zoom: 1, left: 200, top: 100 }
const pinch = { camera, midpoint: { x: 150, y: 150 }, distance: 100 }
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.00001, `${a} != ${b}`)

test('Pinch clamps minimum zoom', () => {
  assert.equal(pinchCamera(pinch, { x: 145, y: 150 }, { x: 155, y: 150 }, bounds).zoom, MIN_ZOOM)
})
test('Pinch clamps maximum zoom', () => {
  assert.equal(pinchCamera(pinch, { x: 0, y: 150 }, { x: 300, y: 150 }, bounds).zoom, MAX_ZOOM)
})
test('Equal pinch distance preserves the camera', () => {
  assert.deepEqual(pinchCamera(pinch, { x: 100, y: 150 }, { x: 200, y: 150 }, bounds), camera)
})
test('Increasing and decreasing distance scale relative to gesture start', () => {
  near(pinchCamera(pinch, { x: 95, y: 150 }, { x: 205, y: 150 }, bounds).zoom, 1.1)
  near(pinchCamera(pinch, { x: 110, y: 150 }, { x: 190, y: 150 }, bounds).zoom, 0.8)
  near(pinchCamera({ ...pinch, camera: { ...camera, zoom: 0.8 } }, { x: 95, y: 150 }, { x: 205, y: 150 }, bounds).zoom, 0.88)
})
test('Moving pinch midpoint preserves its schematic anchor in both axes', () => {
  const next = pinchCamera(pinch, { x: 125, y: 180 }, { x: 235, y: 180 }, bounds)
  near((camera.left + 150) / camera.zoom, (next.left + 180) / next.zoom)
  near((camera.top + 150) / camera.zoom, (next.top + 180) / next.zoom)
})
test('Pan bounds shrink and grow with zoom and clamp undersized axes', () => {
  for (const zoom of [MIN_ZOOM, 1, MAX_ZOOM]) {
    const result = clampCamera({ zoom, left: 10000, top: 10000 }, bounds)
    near(result.left, 928 * zoom - 390)
    near(result.top, 640 * zoom - 300)
  }
  assert.deepEqual(clampCamera({ zoom: MIN_ZOOM, left: -20, top: 100 }, { ...bounds, height: 844 }), { zoom: MIN_ZOOM, left: 0, top: 0 })
})
test('Genuine taps and small jitter allow selection; deliberate pans suppress it', () => {
  const g = new MapGesture()
  g.down(1, { x: 100, y: 100 }, true, camera)
  assert.equal(g.move(1, { x: 102, y: 101 }, camera, bounds), null)
  g.up(1, camera)
  assert.equal(g.suppressClick(1), false)
  g.down(1, { x: 100, y: 100 }, true, camera)
  const next = g.move(1, { x: 120, y: 100 }, camera, bounds)!
  g.up(1, next)
  assert.equal(g.suppressClick(1), true)
  assert.equal(g.suppressClick(0), false, 'keyboard activation remains usable')
})
test('A second contact blocks selection even without movement, then a new tap works', () => {
  const g = new MapGesture()
  g.down(1, { x: 100, y: 100 }, true, camera)
  g.down(2, { x: 200, y: 100 }, true, camera)
  g.up(2, camera); g.up(1, camera)
  assert.equal(g.suppressClick(1), true)
  g.down(3, { x: 100, y: 100 }, true, camera); g.up(3, camera)
  assert.equal(g.suppressClick(1), false)
})
test('Pinch to one-finger pan rebases without a camera jump', () => {
  const g = new MapGesture()
  g.down(1, { x: 100, y: 100 }, true, camera)
  g.down(2, { x: 200, y: 100 }, true, camera)
  const next = g.move(2, { x: 210, y: 100 }, camera, bounds)!
  g.up(2, next)
  assert.equal(g.move(1, { x: 100, y: 100 }, next, bounds), null)
  const panned = g.move(1, { x: 120, y: 100 }, next, bounds)!
  near(panned.left, next.left - 20); near(panned.top, next.top)
  assert.equal(panned.zoom, next.zoom)
  assert.equal(g.suppressClick(1), true)
})
test('Pointer cancellation clears all contacts and permits the next gesture', () => {
  const g = new MapGesture()
  g.down(1, { x: 100, y: 100 }, true, camera)
  g.down(2, { x: 200, y: 100 }, true, camera)
  g.cancel()
  assert.equal(g.contacts.size, 0)
  assert.equal(g.move(1, { x: 110, y: 100 }, camera, bounds), null)
  assert.equal(g.suppressClick(1), true)
  g.down(3, { x: 100, y: 100 }, true, camera); g.up(3, camera)
  assert.equal(g.suppressClick(1), false)
})
test('Third contact pauses camera updates and returning to two contacts rebases', () => {
  const g = new MapGesture()
  g.down(1, { x: 100, y: 100 }, true, camera)
  g.down(2, { x: 200, y: 100 }, true, camera)
  g.down(3, { x: 300, y: 100 }, true, camera)
  assert.equal(g.move(1, { x: 90, y: 100 }, camera, bounds), null)
  g.up(3, camera)
  assert.deepEqual(g.move(1, { x: 90, y: 100 }, camera, bounds), camera)
})
test('Mouse continues panning without enabling multi-contact zoom', () => {
  const g = new MapGesture()
  g.down(1, { x: 100, y: 100 }, false, camera)
  assert.deepEqual(g.move(1, { x: 120, y: 110 }, camera, bounds), { zoom: 1, left: 180, top: 90 })
  g.down(2, { x: 200, y: 100 }, false, camera)
  assert.equal(g.move(2, { x: 220, y: 100 }, camera, bounds), null)
})
