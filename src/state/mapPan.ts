export interface PanStart { x: number; y: number; left: number; top: number }

/** A deliberate gesture must cross the threshold before it can consume a tap. */
export function panPosition(start: PanStart, x: number, y: number, maxLeft: number, maxTop: number) {
  const dx = x - start.x
  const dy = y - start.y
  return {
    moved: Math.hypot(dx, dy) >= 6,
    left: Math.max(0, Math.min(Math.max(0, maxLeft), start.left - dx)),
    top: Math.max(0, Math.min(Math.max(0, maxTop), start.top - dy)),
  }
}

export const MIN_ZOOM = 0.65
export const MAX_ZOOM = 1.15
export interface Camera { zoom: number; left: number; top: number }
export interface Point { x: number; y: number }
export interface CameraBounds { width: number; height: number; canvasWidth: number; canvasHeight: number }

export function clampCamera(camera: Camera, bounds: CameraBounds): Camera {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom))
  return { zoom,
    left: Math.max(0, Math.min(bounds.canvasWidth * zoom - bounds.width, camera.left)),
    top: Math.max(0, Math.min(bounds.canvasHeight * zoom - bounds.height, camera.top)),
  }
}
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
export interface PinchStart { camera: Camera; midpoint: Point; distance: number }
export function pinchCamera(start: PinchStart, a: Point, b: Point, bounds: CameraBounds): Camera {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, start.camera.zoom * distance(a, b) / Math.max(1, start.distance)))
  const mid = midpoint(a, b)
  const ratio = zoom / start.camera.zoom
  return clampCamera({ zoom, left: (start.camera.left + start.midpoint.x) * ratio - mid.x,
    top: (start.camera.top + start.midpoint.y) * ratio - mid.y }, bounds)
}

/** Contact lifecycle shared by the DOM hook and tests; coordinates are viewport-local. */
export class MapGesture {
  contacts = new Map<number, Point & { touch: boolean }>()
  blocked = false
  private pan: PanStart | null = null
  private pinch: PinchStart | null = null
  private moved = false

  private rebase(camera: Camera) {
    const points = [...this.contacts.values()]
    this.pan = points.length === 1 ? { ...points[0]!, left: camera.left, top: camera.top } : null
    this.pinch = points.length === 2 && points.every(point => point.touch)
      ? { camera: { ...camera }, midpoint: midpoint(points[0]!, points[1]!), distance: distance(points[0]!, points[1]!) } : null
    this.moved = false
  }
  down(id: number, point: Point, touch: boolean, camera: Camera) {
    if (!this.contacts.size) this.blocked = false
    this.contacts.set(id, { ...point, touch })
    if (this.contacts.size > 1) this.blocked = true
    this.rebase(camera)
  }
  move(id: number, point: Point, camera: Camera, bounds: CameraBounds): Camera | null {
    const contact = this.contacts.get(id)
    if (!contact) return null
    this.contacts.set(id, { ...point, touch: contact.touch })
    if (this.pinch) {
      const points = [...this.contacts.values()]
      return pinchCamera(this.pinch, points[0]!, points[1]!, bounds)
    }
    if (!this.pan) return null
    const next = panPosition(this.pan, point.x, point.y, bounds.canvasWidth * camera.zoom - bounds.width, bounds.canvasHeight * camera.zoom - bounds.height)
    if (!this.moved && !next.moved) return null
    this.moved = true; this.blocked = true
    return { zoom: camera.zoom, left: next.left, top: next.top }
  }
  up(id: number, camera: Camera) {
    this.contacts.delete(id)
    this.rebase(camera)
  }
  cancel() {
    this.contacts.clear(); this.pan = null; this.pinch = null; this.moved = false
    this.blocked = true
  }
  suppressClick(detail: number) { return detail !== 0 && this.blocked }
}
