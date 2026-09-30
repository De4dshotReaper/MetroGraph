import type { Algorithm, MetroGraph, RouteRequest } from '../types/graph.ts'

interface Props {
  graph: MetroGraph; route: RouteRequest; algorithm: Algorithm
  onChange: (algorithm: Algorithm) => void; onVisualize: () => void
  onChangeOrigin: () => void; onChangeDestination: () => void
}

export function RouteSetup({ graph, route, algorithm, onChange, onVisualize, onChangeOrigin, onChangeDestination }: Props) {
  const origin = graph.stations.find(station => station.id === route.origin)!
  const destination = graph.stations.find(station => station.id === route.destination)!
  return <section className="surface route-setup" aria-labelledby="configure-title">
    <p className="eyebrow">Your journey</p>
    <h2 id="configure-title">Find your way.</h2>
    <div className="endpoints">
      <button className="endpoint" onClick={onChangeOrigin} aria-label={'Change origin: ' + origin.name}>
        <span className="endpoint-symbol origin-symbol" /><span><small>From</small><strong>{origin.name}</strong></span><span className="edit-hint">Edit</span>
      </button>
      <button className="endpoint" onClick={onChangeDestination} aria-label={'Change destination: ' + destination.name}>
        <span className="endpoint-symbol destination-symbol" /><span><small>To</small><strong>{destination.name}</strong></span><span className="edit-hint">Edit</span>
      </button>
    </div>
    <fieldset className="algorithm-options"><legend className="eyebrow">Choose a route</legend>
      <label className="algorithm-option">
        <input type="radio" name="algorithm" value="BFS" checked={algorithm === 'BFS'} onChange={() => onChange('BFS')} />
        <span className="algorithm-option-body"><strong>BFS</strong><span>Fewest Stops</span><i aria-hidden="true" /></span>
      </label>
      <label className="algorithm-option">
        <input type="radio" name="algorithm" value="Dijkstra" checked={algorithm === 'Dijkstra'} onChange={() => onChange('Dijkstra')} />
        <span className="algorithm-option-body"><strong>Dijkstra</strong><span>Fastest Route</span><i aria-hidden="true" /></span>
      </label>
    </fieldset>
    <button className="primary visualize-button" onClick={onVisualize}>Visualize Route <span aria-hidden="true">↗</span></button>
    <p className="panel-footnote">Follow the search, one connection at a time.</p>
  </section>
}
