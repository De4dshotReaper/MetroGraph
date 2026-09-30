import { useMemo } from 'react'
import type { AlgorithmEvent, MetroGraph, SimulationState } from '../types/graph.ts'
import { StationNode } from './StationNode.tsx'
import { EdgeTravel } from './EdgeTravel.tsx'
import type { Journey } from '../state/journey.ts'

interface Props {
  graph: MetroGraph; state: SimulationState; journey: Journey; closed: ReadonlySet<string>
  disruptionMode: boolean; onSelect: (id: string) => void; event: AlgorithmEvent | null
  eventKey: string; playing: boolean; speed: number; duration: number
}

export function MetroMap({ graph, state, journey, closed, disruptionMode, onSelect, event, eventKey, playing, speed, duration }: Props) {
  const stations = useMemo(() => new Map(graph.stations.map(station => [station.id, station])), [graph])
  const colors = useMemo(() => new Map(graph.lines.map(line => [line.id, line.color])), [graph])
  const xs = graph.stations.map(station => station.x)
  const ys = graph.stations.map(station => station.y)
  const left = Math.min(...xs) - 80
  const top = Math.min(...ys) - 40
  const width = Math.max(...xs) - left + 80
  const height = Math.max(...ys) - top + 60
  const selection = journey.phase === 'SELECT_ORIGIN' || journey.phase === 'SELECT_DESTINATION'
  const result = journey.phase === 'RESULT' && state.reachable
  const settled = journey.phase === 'RESULT'
  const exploring = journey.phase === 'SIMULATING'
  const activeEdge = event?.type === 'edge-explored' ? event : null
  const edgeColor = activeEdge ? colors.get(graph.connections.find(edge => edge.id === activeEdge.connectionId)!.lineId) : undefined
  // Presentation only: compare adjacent reconstructed edges at each interior stop.
  const transfers = new Map<string, [string, string]>()
  if (result) {
    const routeEdges = state.pathConnections.map(id => graph.connections.find(edge => edge.id === id)!)
    for (let index = 1; index < routeEdges.length; index++) {
      const incoming = routeEdges[index - 1]!.lineId
      const outgoing = routeEdges[index]!.lineId
      if (incoming !== outgoing) transfers.set(state.path[index]!, [colors.get(incoming)!, colors.get(outgoing)!])
    }
  }
  return (
    <section className="map-workspace" aria-label="Metro network">
      <div className="map-scroll" tabIndex={0} role="region" aria-label="Scrollable metro map. Use arrow keys to pan on smaller screens.">
      <svg viewBox={`${left} ${top} ${width} ${height}`} role="group" aria-labelledby="map-title map-description" className="metro-svg">
        <title id="map-title">MetroGraph network</title>
        <desc id="map-description">{graph.stations.length} stations on {graph.lines.length} bidirectional lines. Select stations with a click, Enter or Space. A circle marks origin, a square marks destination, and a cross marks a closed station.</desc>
        <g className="network-presentation">
        <g aria-label="Base network" className="base-network">{graph.connections.map(edge => {
          const from = stations.get(edge.from)!
          const to = stations.get(edge.to)!
          return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={colors.get(edge.lineId)} strokeWidth="5.5" strokeLinecap="round" className="base-edge" opacity={closed.has(edge.from) || closed.has(edge.to) ? 0.08 : settled ? 0.14 : exploring ? 0.38 : 0.9} />
        })}</g>
        <g aria-label="Algorithm exploration" pointerEvents="none" opacity={settled ? 0.06 : 1}>
          {graph.connections.filter(edge => state.exploredConnections.includes(edge.id) && !closed.has(edge.from) && !closed.has(edge.to)).map(edge => {
            const from = stations.get(edge.from)!
            const to = stations.get(edge.to)!
            return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={colors.get(edge.lineId)} strokeWidth="6" strokeLinecap="round" opacity="0.65" />
          })}
          {activeEdge && <EdgeTravel key={eventKey} from={stations.get(activeEdge.from)!} to={stations.get(activeEdge.to)!} duration={duration} speed={speed} playing={playing} color={edgeColor ?? 'var(--foreground)'} />}
        </g>
        <g aria-label="Final route" pointerEvents="none">{result && graph.connections.filter(edge => state.pathConnections.includes(edge.id)).map(edge => {
          const from = stations.get(edge.from)!
          const to = stations.get(edge.to)!
          return <g key={edge.id} className="final-edge" style={{ color: colors.get(edge.lineId) }}><line className="final-edge-bloom" x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" strokeWidth="16" strokeLinecap="round" opacity="0.2" /><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" strokeWidth="7" strokeLinecap="round" /><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--foreground)" strokeWidth="2" opacity="0.6" /></g>
        })}</g>
        {graph.stations.map(station => <StationNode key={station.id} station={station} color={colors.get(station.lineIds[0] ?? '') ?? 'var(--foreground)'}
          current={!settled && state.currentStation === station.id} visited={state.visited.includes(station.id)} discovered={!settled && state.discovered.includes(station.id)}
          transferColors={transfers.get(station.id)}
          onPath={Boolean(result && state.path.includes(station.id))} origin={journey.origin === station.id} destination={journey.destination === station.id}
          closed={closed.has(station.id)} subdued={Boolean(settled && (!result || !state.path.includes(station.id)))}
          lineNames={station.lineIds.map(id => graph.lines.find(line => line.id === id)!.name).join(' / ')}
          interactive={disruptionMode || (selection && !closed.has(station.id))} disruptionMode={disruptionMode} onSelect={onSelect} />)}
        </g>
      </svg>
      </div>
    </section>
  )
}
