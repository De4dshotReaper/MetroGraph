import { useLayoutEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react'
import { MapGesture } from '../state/mapPan.ts'
import type { Camera, CameraBounds } from '../state/mapPan.ts'

export function useMobileMapPan(mobile: boolean, center: { x: number; y: number }, viewBox: { left: number; top: number; width: number; height: number }) {
  const viewport = useRef<HTMLDivElement>(null)
  const gesture = useRef(new MapGesture())
  const zoom = useRef(1)
  const canvas = useRef({ width: 0, height: 0 })
  const updateLabels = useRef(() => {})
  const camera = (element: HTMLDivElement): Camera => ({ zoom: zoom.current, left: element.scrollLeft, top: element.scrollTop })
  const bounds = (element: HTMLDivElement): CameraBounds => ({ width: element.clientWidth, height: element.clientHeight, canvasWidth: canvas.current.width, canvasHeight: canvas.current.height })

  useLayoutEffect(() => {
    const element = viewport.current
    if (!element) return
    if (!mobile) { element.scrollLeft = 0; element.scrollTop = 0; return }
    const svg = element.querySelector('svg')!
    canvas.current = { width: svg.clientWidth, height: svg.clientHeight }
    const labels = () => {
      const bounds = element.getBoundingClientRect()
      element.querySelectorAll<SVGTextElement>('.station-label').forEach(label => {
        const rect = label.getBoundingClientRect()
        label.dataset.clipped = String(rect.left < bounds.left + 6 || rect.right > bounds.right - 6 || rect.top < bounds.top + 4 || rect.bottom > bounds.bottom - 4)
      })
    }
    updateLabels.current = labels
    let previousWidth = 0
    let previousHeight = 0
    const position = () => {
      const width = element.clientWidth
      const height = element.clientHeight
      const x = previousWidth ? element.scrollLeft + previousWidth / 2 : (center.x - viewBox.left) * svg.clientWidth / viewBox.width
      const y = previousHeight ? element.scrollTop + previousHeight / 2 : (center.y - viewBox.top) * svg.clientHeight / viewBox.height
      element.scrollLeft = x - width / 2
      element.scrollTop = y - height / 2
      previousWidth = width; previousHeight = height
      // A sheet/orientation change must not leave a gesture using stale viewport coordinates.
      gesture.current.cancel()
      labels()
    }
    position()
    const resize = new ResizeObserver(position)
    resize.observe(element)
    element.addEventListener('scroll', labels, { passive: true })
    return () => {
      resize.disconnect(); element.removeEventListener('scroll', labels)
      element.querySelectorAll<SVGTextElement>('.station-label').forEach(label => { delete label.dataset.clipped })
      svg.style.removeProperty('width'); svg.style.removeProperty('height')
      delete element.dataset.dragging
      zoom.current = 1; gesture.current = new MapGesture(); updateLabels.current = () => {}
    }
  }, [mobile, center.x, center.y, viewBox.left, viewBox.top, viewBox.width, viewBox.height])

  const point = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const capture = (element: HTMLDivElement) => {
    for (const id of gesture.current.contacts.keys()) {
      if (!element.hasPointerCapture(id)) element.setPointerCapture(id)
    }
  }
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!mobile || event.button !== 0 || (event.pointerType !== 'touch' && !event.isPrimary)) return
    gesture.current.down(event.pointerId, point(event), event.pointerType === 'touch', camera(event.currentTarget))
    if (gesture.current.contacts.size > 1) { capture(event.currentTarget); event.preventDefault() }
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!mobile) return
    const element = event.currentTarget
    const next = gesture.current.move(event.pointerId, point(event), camera(element), bounds(element))
    if (!next) return
    capture(element)
    element.dataset.dragging = 'true'
    if (next.zoom !== zoom.current) {
      const svg = element.querySelector('svg')!
      // Resize the same scrollable SVG canvas: all map layers share its camera.
      svg.style.width = `${canvas.current.width * next.zoom}px`
      svg.style.height = `${canvas.current.height * next.zoom}px`
      zoom.current = next.zoom
    }
    element.scrollLeft = next.left; element.scrollTop = next.top
    updateLabels.current()
    event.preventDefault()
  }
  const finish = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!gesture.current.contacts.has(event.pointerId)) return
    gesture.current.up(event.pointerId, camera(event.currentTarget))
    if (!gesture.current.contacts.size) delete event.currentTarget.dataset.dragging
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const cancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.type === 'lostpointercapture' && event.target !== event.currentTarget) return
    if (!gesture.current.contacts.has(event.pointerId)) return
    const ids = [...gesture.current.contacts.keys()]
    gesture.current.cancel()
    delete event.currentTarget.dataset.dragging
    for (const id of ids) if (event.currentTarget.hasPointerCapture(id)) event.currentTarget.releasePointerCapture(id)
  }
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (mobile && gesture.current.suppressClick(event.detail)) {
      event.preventDefault(); event.stopPropagation()
    }
  }
  return { ref: viewport, onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: cancel, onLostPointerCapture: cancel, onClickCapture }
}
