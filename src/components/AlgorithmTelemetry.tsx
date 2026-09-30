import type { Algorithm, AlgorithmEvent, MetroGraph, SimulationState } from '../types/graph.ts'

interface Props { graph: MetroGraph; algorithm: Algorithm; state: SimulationState; event: AlgorithmEvent | null; cursor: number; count: number }

export function AlgorithmTelemetry({ graph, algorithm, state, event, cursor, count }: Props) {
  const name = (id: string) => graph.stations.find(station => station.id === id)?.name ?? id
  const currentDistance = state.currentStation === null ? undefined : state.distances[state.currentStation]
  const entries = state.frontier.slice(0, 4)
  return <section className="surface telemetry" aria-label="Live algorithm telemetry" data-algorithm={algorithm}>
    <div className="telemetry-heading"><span className="eyebrow">{algorithm} <span className="muted">/ {algorithm === 'BFS' ? 'Fewest Stops' : 'Fastest Route'}</span></span><span className="activity-dot" aria-hidden="true" /></div>
    <div className="current-station">
      <span className="eyebrow">Current station</span>
      <h2>{state.currentStation ? name(state.currentStation) : state.complete ? 'Search complete' : 'Ready to explore'}</h2>
      {algorithm === 'Dijkstra' && <div className="weighted-time"><span className="eyebrow">Current time</span><p className="current-distance"><strong>{currentDistance === undefined ? '—' : String(currentDistance).padStart(2, '0')}</strong><span>MIN</span></p><span className="distance-caption">Cumulative best-known travel time</span></div>}
    </div>
    <div className="frontier-block">
      <div className="frontier-heading"><h3 className="eyebrow">{algorithm === 'BFS' ? 'Queue' : 'Priority frontier'}</h3><span className="technical muted">{algorithm === 'BFS' ? 'hop depth' : 'minutes'}</span></div>
      <ol className="frontier-list">{entries.map((entry, index) => <li key={entry.stationId}><span className="frontier-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span>{name(entry.stationId)}</span><b>{String(entry.priority).padStart(2, '0')}{algorithm === 'Dijkstra' ? 'm' : ''}</b></li>)}</ol>
      {!entries.length && <p className="frontier-empty">{state.complete ? 'No further expansion needed.' : 'Waiting for the next discovery.'}</p>}
      {state.frontier.length > 4 && <details className="frontier-more"><summary>+{state.frontier.length - 4} more in frontier</summary><ol className="frontier-list">{state.frontier.slice(4).map(entry => <li key={entry.stationId}><span>{name(entry.stationId)}</span><b>{entry.priority}{algorithm === 'Dijkstra' ? 'm' : ''}</b></li>)}</ol></details>}
    </div>
    <div className="telemetry-stats">
      <div><span className="eyebrow">Visited</span><p><strong>{String(state.visited.length).padStart(2, '0')}</strong><span> / {graph.stations.length}</span></p></div>
      <div><span className="eyebrow">Step</span><p data-testid="event-counter"><strong>{String(cursor).padStart(3, '0')}</strong><span> / {count}</span></p></div>
    </div>
    <div className="event-progress" role="progressbar" aria-label="Algorithm events consumed" aria-valuenow={cursor} aria-valuemin={0} aria-valuemax={count || 1}><span style={{ width: (count ? cursor / count * 100 : 0) + '%' }} /></div>
    <p className="event-caption">{event?.type === 'distance-updated' ? name(event.stationId) + ' · best time ' + event.distance + ' min' : event?.type === 'edge-explored' ? name(event.from) + ' → ' + name(event.to) : state.complete ? 'Traversal complete' : 'Discovered ' + state.discovered.length + ' stations'}</p>
  </section>
}
