import type { ReactNode } from 'react'
import type { Algorithm, MetroGraph, RouteRequest, SimulationState } from '../types/graph.ts'
import { countTransfers } from '../state/routeSummary.ts'

interface Props { graph: MetroGraph; state: SimulationState; route: RouteRequest; algorithm: Algorithm; closed: ReadonlySet<string>; executionDetails: ReactNode; onReplay: () => void; onNewJourney: () => void; onRestoreAll: () => void }

export function RouteResult({ graph, state, route, algorithm, closed, executionDetails, onReplay, onNewJourney, onRestoreAll }: Props) {
  const name = (id: string) => graph.stations.find(station => station.id === id)?.name ?? id
  const endpointClosed = closed.has(route.origin) || closed.has(route.destination)
  const transfers = countTransfers(graph, state.pathConnections)
  return <section className="surface route-result" aria-live="polite">
    <p className="eyebrow result-status"><span aria-hidden="true">{state.reachable ? '↗' : '—'}</span>{state.reachable ? 'Journey complete' : 'Connection unavailable'}</p>
    <h2>{state.reachable ? 'Route found.' : 'No route available'}</h2>
    <p className="result-endpoints">{name(route.origin)}<span aria-hidden="true"> → </span><span className="sr-only"> to </span>{name(route.destination)}</p>
    {state.reachable ? <>
      <div className="result-metrics"><div className="result-time"><strong>{state.travelTime}</strong><span>min</span></div><div><strong>{state.pathConnections.length}</strong><span>connections</span></div><div><strong>{transfers}</strong><span>{transfers === 1 ? 'transfer' : 'transfers'}</span></div></div>
      <p className="result-algorithm technical">{algorithm} · {algorithm === 'BFS' ? 'Fewest Stops' : 'Fastest Route'}</p>
      <details className="route-details"><summary>View route <span>{state.path.length} stations</span></summary><ol>{state.path.map((id, index) => <li key={id}><span className="technical">{String(index + 1).padStart(2, '0')}</span>{name(id)}</li>)}</ol></details>
    </> : <p className="no-route-copy">{endpointClosed ? 'Your origin or destination is closed.' : 'The current disruptions prevent a connection between these stations.'} Restore the network or plan another journey.</p>}
    <details className="execution-details"><summary>Execution details <span>{algorithm}</span></summary>{executionDetails}</details>
    <div className="panel-actions">{state.reachable ? <button className="secondary" onClick={onReplay}>↺ Replay</button> : <button className="secondary" disabled={!closed.size} onClick={onRestoreAll}>Restore disruptions</button>}<button className="primary" onClick={onNewJourney}>New Journey</button></div>
    {!state.reachable && <button className="text-button no-route-replay" onClick={onReplay}>Replay search</button>}
  </section>
}
