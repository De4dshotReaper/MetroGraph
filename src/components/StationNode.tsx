import { memo } from 'react'
import type { Station } from '../types/graph.ts'

interface Props {
  station: Station; color: string; current: boolean; visited: boolean; discovered: boolean
  onPath: boolean; origin: boolean; destination: boolean; closed: boolean; subdued: boolean
  interactive: boolean; disruptionMode: boolean; onSelect: (id: string) => void
  lineNames: string; transferColors?: [string, string]
}

export const StationNode = memo(function StationNode({ station, color, current, visited, discovered, onPath, origin, destination, closed, subdued, interactive, disruptionMode, onSelect, lineNames, transferColors }: Props) {
  const status = closed ? 'closed' : origin ? 'origin' : destination ? 'destination' : current ? 'current' : onPath ? 'final route' : visited ? 'visited' : discovered ? 'discovered' : 'operational'
  return (
    <g transform={`translate(${station.x}, ${station.y})`} role="button" tabIndex={interactive ? 0 : -1}
      aria-label={`${station.name}, ${status}${transferColors ? ', transfer station' : ''}${disruptionMode ? (closed ? ', restore station' : ', close station') : ''}`}
      aria-disabled={!interactive} data-station-id={station.id} data-state={status}
      className={`station-node ${interactive ? 'interactive' : ''} ${transferColors ? 'route-transfer' : ''}`} style={{ color }} opacity={subdued && !origin && !destination && !closed ? 0.24 : 1}
      onClick={() => { if (interactive) onSelect(station.id) }}
      onKeyDown={event => { if (interactive && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect(station.id) } }}>
      <title>{station.name} · {lineNames} · {status}</title>
      <circle r="28" fill="transparent" className="station-hit" />
      <circle r="21" className="station-hover" fill="var(--foreground)" fillOpacity="0.045" stroke="var(--foreground)" strokeOpacity="0.65" strokeWidth="1.3" />
      {discovered && !visited && !closed && <circle className="station-discovered" r="13" fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.6" strokeWidth="1.2" />}
      {current && !closed && <g className="current-halo"><circle className="current-bloom" r="23" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2" /><circle r="14" fill="none" stroke={color} strokeWidth="2.5" /><circle r="12" fill="none" stroke="var(--foreground)" strokeOpacity="0.65" strokeWidth="1" /></g>}
      {onPath && !closed && <circle className="route-node-bloom" r={transferColors ? 18 : 11} fill={color} fillOpacity="0.18" stroke={color} strokeOpacity="0.5" strokeWidth="2" />}
      {transferColors && !closed && <g className="transfer-ring" fill="none" strokeWidth="3"><path d="M 0 -15 A 15 15 0 0 1 0 15" stroke={transferColors[0]} /><path d="M 0 15 A 15 15 0 0 1 0 -15" stroke={transferColors[1]} /></g>}
      {origin && <circle r="16" fill="none" stroke="var(--foreground)" strokeWidth="2" />}
      {destination && <rect x="-14" y="-14" width="28" height="28" rx="4" fill="none" stroke="var(--foreground)" strokeWidth="2" />}
      <circle className="station-core" r={station.isInterchange ? 10 : 6.5} fill={!closed && (onPath || visited) ? color : 'var(--background)'} stroke={closed ? 'var(--closed)' : color} strokeWidth={onPath ? 3 : 2.5} />
      {closed ? <path d="M -5 -5 L 5 5 M -5 5 L 5 -5" stroke="var(--closed)" strokeWidth="2" strokeLinecap="round" /> : station.isInterchange && <circle r="5" fill="var(--background)" stroke="var(--foreground)" strokeWidth="1.5" />}
      {(origin || destination) && <text y="-26" textAnchor="middle" className="station-role">{origin ? 'START' : 'END'}</text>}
      <text y="34" textAnchor="middle" className={'station-label' + (station.isInterchange || origin || destination || current || onPath || closed ? ' persistent' : '') + (station.isInterchange ? ' interchange-label' : '')} fill={closed ? 'var(--closed)' : 'var(--foreground)'} fontSize="17" paintOrder="stroke" stroke="var(--background)" strokeWidth="5">{station.name}</text>
    </g>
  )
})
