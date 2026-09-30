import type { ReactNode } from 'react'
import type { Algorithm, MetroGraph, SimulationState } from '../types/graph.ts'
import type { LiveCalculationState } from '../state/liveCalculation.ts'
import { LiveCalculation } from './LiveCalculation.tsx'

export function MobileSimulation({ graph, algorithm, state, cursor, count, calculation, telemetry }: {
  graph: MetroGraph; algorithm: Algorithm; state: SimulationState; cursor: number; count: number
  calculation: LiveCalculationState | null; telemetry: ReactNode
}) {
  const current = graph.stations.find(station => station.id === state.currentStation)
  const distance = state.currentStation === null ? undefined : state.distances[state.currentStation]
  return <section className="surface mobile-simulation" aria-label="Simulation information">
    <div className="mobile-current"><div><span className="eyebrow">{algorithm} · Current station</span><h2>{current?.name ?? 'Ready to explore'}</h2></div>
      {algorithm === 'Dijkstra' && <div className="mobile-time"><span className="eyebrow">Current time</span><strong>{distance ?? '—'}<small> min</small></strong></div>}
    </div>
    <p className="mobile-progress technical">Visited {state.visited.length}/{graph.stations.length}<span>Step {cursor}/{count}</span></p>
    <LiveCalculation graph={graph} algorithm={algorithm} calculation={calculation} />
    <details className="mobile-telemetry-details"><summary>{algorithm === 'BFS' ? 'Queue · hop depth' : 'Priority frontier · minutes'}<span>{state.frontier.length} waiting</span></summary>{telemetry}</details>
  </section>
}
