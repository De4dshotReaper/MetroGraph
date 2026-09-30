import type { MetroGraph } from '../types/graph.ts'

interface Props { graph: MetroGraph; closed: ReadonlySet<string>; managing: boolean; onInspect: () => void }

export function NetworkStatus({ graph, closed, managing, onInspect }: Props) {
  const operational = graph.stations.length - closed.size
  const status = closed.size ? closed.size + (closed.size === 1 ? ' disruption' : ' disruptions') : 'Network operational'
  return <div role="status"><button className="network-status" onClick={onInspect} aria-expanded={managing} aria-label={`${operational} of ${graph.stations.length} stations operational. ${status}. Manage network`}>
    <span className={'status-dot' + (closed.size ? ' disrupted' : '')} aria-hidden="true" />
    <span>{operational} / {graph.stations.length} <span className="status-separator">·</span> {status}</span>
    <span className="status-manage" aria-hidden="true">→ Manage network</span>
  </button></div>
}
