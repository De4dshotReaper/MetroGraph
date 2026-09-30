import { useLayoutEffect, useRef } from 'react'
import type { Station } from '../types/graph.ts'

interface Props { from: Station; to: Station; duration: number; speed: number; playing: boolean; color: string }

/** This overlay exists only for an actual edge-explored event, directed from → to. */
export function EdgeTravel({ from, to, duration, speed, playing, color }: Props) {
  const element = useRef<SVGLineElement>(null)
  const animation = useRef<Animation | null>(null)
  const initiallyPlaying = useRef(playing)
  const playback = useRef({ playing, speed })
  useLayoutEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const start = () => {
      animation.current?.cancel()
      if (!element.current || motion.matches) { animation.current = null; return }
      const next = element.current.animate([{ strokeDashoffset: '18' }, { strokeDashoffset: '-100' }], { duration, fill: 'both', easing: 'linear' })
      next.pause()
      // Manual stepping applies one whole event; keep its edge visibly highlighted.
      next.currentTime = initiallyPlaying.current ? 0 : duration * 0.82
      animation.current = next
    }
    start()
    const change = () => {
      start()
      if (animation.current) {
        animation.current.updatePlaybackRate(playback.current.speed)
        if (playback.current.playing) animation.current.play()
      }
    }
    motion.addEventListener('change', change)
    return () => { animation.current?.cancel(); motion.removeEventListener('change', change) }
  }, [duration])
  useLayoutEffect(() => {
    playback.current = { playing, speed }
    const current = animation.current
    if (!current) return
    current.updatePlaybackRate(speed)
    if (playing) current.play()
    else current.pause()
  }, [speed, playing])
  return <line ref={element} className="edge-travel" style={{ color }} x1={from.x} y1={from.y} x2={to.x} y2={to.y} pathLength="100" strokeDasharray="18 100" strokeWidth="7" strokeLinecap="round" />
}
