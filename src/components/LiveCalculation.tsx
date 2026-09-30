import type { CSSProperties } from 'react'
import type { Algorithm, MetroGraph } from '../types/graph.ts'
import type { LiveCalculationState } from '../state/liveCalculation.ts'

export function LiveCalculation({ graph, algorithm, calculation }: { graph: MetroGraph; algorithm: Algorithm; calculation: LiveCalculationState | null }) {
  const name = (id: string) => graph.stations.find(station => station.id === id)?.name ?? id
  const edge = graph.connections.find(connection => connection.id === calculation?.connectionId)
  const color = graph.lines.find(line => line.id === edge?.lineId)?.color ?? 'var(--muted)'
  const minutes = (value: number) => Number.isFinite(value) ? `${value}m` : '∞'
  return <section className="surface live-calculation" aria-label="Live calculation" style={{ '--calculation-color': color } as CSSProperties}>
    <div className="calculation-heading"><h3 className="eyebrow">Live calculation</h3><span className="technical muted">{algorithm}</span></div>
    {!calculation ? <p className="calculation-waiting">Waiting for an edge evaluation.</p> : <div className="calculation-content" key={calculation.eventIndex}>
      <p className="calculation-edge">{name(calculation.from)} <span aria-hidden="true">→</span> {name(calculation.to)}</p>
      <dl className="calculation-values">
        <div><dt>{calculation.algorithm === 'BFS' ? 'Current depth' : 'Current distance'}</dt><dd>{calculation.algorithm === 'BFS' ? calculation.current : minutes(calculation.current)}</dd></div>
        <div><dt>{calculation.algorithm === 'BFS' ? 'Edge cost' : 'Edge weight'}</dt><dd>+{calculation.algorithm === 'BFS' ? '1 hop' : minutes(calculation.cost)}</dd></div>
        <div className="calculation-total"><dt>{calculation.algorithm === 'BFS' ? 'Candidate depth' : 'Candidate distance'}</dt><dd>{calculation.candidate === null ? '—' : calculation.algorithm === 'BFS' ? calculation.candidate : minutes(calculation.candidate)}</dd></div>
        {calculation.algorithm === 'Dijkstra' && <div><dt>Previous best</dt><dd>{minutes(calculation.previous)}</dd></div>}
      </dl>
      {calculation.algorithm === 'BFS' ? <p className="calculation-outcome"><strong>{calculation.current} + 1 = {calculation.candidate}</strong><span>{calculation.outcome === 'known' ? 'Already discovered · keep existing depth' : calculation.outcome === 'pending' ? 'Undiscovered · awaiting discovery event' : `${name(calculation.to)} discovered at depth ${calculation.candidate}`}</span></p>
        : <p className="calculation-outcome"><strong>{calculation.outcome === 'settled' ? 'SKIP · already settled' : <>{minutes(calculation.candidate!)} {calculation.outcome === 'update' ? '<' : '≥'} {minutes(calculation.previous)} <b>{calculation.outcome.toUpperCase()}</b></>}</strong><span>{calculation.outcome === 'settled' ? 'No relaxation performed for this target.' : `${minutes(calculation.current)} + ${minutes(calculation.cost)} = ${minutes(calculation.candidate!)}`}</span></p>}
    </div>}
  </section>
}
