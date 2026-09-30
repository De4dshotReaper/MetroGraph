import type { MetroGraph } from '../types/graph.ts'

interface Props { graph: MetroGraph; closed: ReadonlySet<string>; onRestore: (id: string) => void; onRestoreAll: () => void; onExit: () => void }

export function DisruptionPanel({ graph, closed, onRestore, onRestoreAll, onExit }: Props) {
  return <section className="surface disruption-panel" aria-labelledby="disruption-title">
    <div className="panel-topline"><span className="eyebrow">Network management</span><button className="icon-button" aria-label="Exit disruption mode" onClick={onExit}>×</button></div>
    <h2 id="disruption-title">Disruption mode</h2>
    <p className="muted">Select stations to close or restore.</p>
    <div className="disruption-list">
      {closed.size ? <ul>{graph.stations.filter(station => closed.has(station.id)).map(station => <li key={station.id}><span><i aria-hidden="true">×</i>{station.name}</span><button className="text-button" onClick={() => onRestore(station.id)} aria-label={'Restore ' + station.name}>Restore</button></li>)}</ul> : <p className="empty-network"><span aria-hidden="true">✓</span> All stations are operational.</p>}
    </div>
    <div className="panel-actions"><button className="secondary" disabled={!closed.size} onClick={onRestoreAll}>Restore All</button><button className="primary" onClick={onExit}>Done</button></div>
  </section>
}
