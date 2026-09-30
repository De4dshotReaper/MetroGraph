import { useEffect } from 'react'

export function Intro({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(onComplete, reduced ? 50 : 1500)
    return () => window.clearTimeout(timer)
  }, [onComplete])
  return <div className="intro"><h1>MetroGraph</h1></div>
}
