import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { bfs } from './algorithms/bfs.ts'
import { dijkstra } from './algorithms/dijkstra.ts'
import { AlgorithmTelemetry } from './components/AlgorithmTelemetry.tsx'
import { MetroMap } from './components/MetroMap.tsx'
import { NetworkStatus } from './components/NetworkStatus.tsx'
import { PlaybackControls } from './components/PlaybackControls.tsx'
import { RouteResult } from './components/RouteResult.tsx'
import { RouteSetup } from './components/RouteSetup.tsx'
import { network } from './data/network.ts'
import { useSimulation } from './hooks/useSimulation.ts'
import { initialSimulationState } from './hooks/simulationState.ts'
import { initialJourneyState, journeyReducer } from './state/journey.ts'
import { Intro } from './components/Intro.tsx'
import { DisruptionPanel } from './components/DisruptionPanel.tsx'
import { LiveCalculation } from './components/LiveCalculation.tsx'
import { deriveLiveCalculation } from './state/liveCalculation.ts'

const emptySimulation = initialSimulationState()

export default function App() {
  const [application, dispatch] = useReducer(journeyReducer, undefined, initialJourneyState)
  const { journey, algorithm, run, mode, notice } = application
  const simulation = useSimulation()
  const { loadEvents } = simulation
  const calculation = useMemo(() => deriveLiveCalculation(network, simulation.events, simulation.cursor), [simulation.events, simulation.cursor])
  const closed = useMemo(() => new Set(application.closedStationIds), [application.closedStationIds])
  const introComplete = useCallback(() => dispatch({ type: 'intro-complete' }), [])
  const selectStation = useCallback((stationId: string) => dispatch({ type: 'select-station', stationId }), [])

  useEffect(() => {
    if (!run) { loadEvents([]); return }
    const execute = run.algorithm === 'BFS' ? bfs : dijkstra
    loadEvents(execute(network, run, { closedStationIds: new Set(run.closedStationIds) }), run.id, true)
  }, [run, loadEvents])

  useEffect(() => {
    if (simulation.state.complete) dispatch({ type: 'complete', runId: simulation.runId })
  }, [simulation.state.complete, simulation.runId])

  if (journey.phase === 'INTRO') return <Intro onComplete={introComplete} />
  const active = run?.id === simulation.runId
  const visibleState = active ? simulation.state : emptySimulation
  const hasPlayback = journey.phase === 'SIMULATING' || journey.phase === 'RESULT'
  const hasSidebar = hasPlayback || journey.phase === 'CONFIGURE'
  const originName = network.stations.find(station => station.id === journey.origin)?.name
  const destinationName = network.stations.find(station => station.id === journey.destination)?.name
  const hasPanel = hasSidebar || mode === 'disruptions'
  const telemetry = <AlgorithmTelemetry graph={network} algorithm={algorithm} state={visibleState} event={active ? simulation.currentEvent : null} cursor={active ? simulation.cursor : 0} count={active ? simulation.eventCount : 0} />

  return <main className="application" data-phase={journey.phase} data-panel={hasPanel ? 'open' : 'none'} data-playing={simulation.isPlaying} data-mode={mode}>
    <header className="masthead">
      <div className="brand"><h1><svg viewBox="0 0 30 30" width="27" height="27" aria-hidden="true"><path d="M5 23V7l10 10L25 7v16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="5" cy="23" r="3" fill="currentColor" /><circle cx="25" cy="23" r="3" fill="currentColor" /></svg>MetroGraph</h1>
        <NetworkStatus graph={network} closed={closed} managing={mode === 'disruptions'} onInspect={() => dispatch({ type: 'set-mode', mode: 'disruptions' })} />
      </div>
      <nav className="header-actions" aria-label="Journey and network">
        {journey.phase !== 'SELECT_ORIGIN' && journey.phase !== 'RESULT' && <button className="text-button new-journey-header" onClick={() => dispatch({ type: 'new-journey' })}>New Journey</button>}
        {mode === 'disruptions' && <button className="utility-button" aria-label="Exit disruption mode" onClick={() => dispatch({ type: 'set-mode', mode: 'journey' })}><svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 12h12" stroke="currentColor" /><circle cx="6" cy="4" r="2" fill="var(--background)" stroke="currentColor" /><circle cx="10" cy="12" r="2" fill="var(--background)" stroke="currentColor" /></svg>Exit mode</button>}
      </nav>
    </header>
    {destinationName && <div className="journey-caption"><span className="eyebrow">{journey.phase === 'SIMULATING' ? simulation.isPlaying ? 'Exploring the network' : 'Exploration paused' : journey.phase === 'RESULT' ? 'Your connection' : 'Plan your connection'}</span><p>{originName} <span aria-hidden="true">→</span> {destinationName}</p></div>}
    <MetroMap graph={network} state={visibleState} journey={journey} closed={closed} disruptionMode={mode === 'disruptions'} onSelect={selectStation}
        event={active ? simulation.currentEvent : null} eventKey={`${simulation.runId}:${simulation.cursor}`} playing={simulation.isPlaying} speed={simulation.speed} duration={simulation.duration} />
    <aside className={'floating-rail' + (!hasPanel ? ' selection-rail' : '')} aria-label="Journey controls">
      {mode === 'disruptions' && <DisruptionPanel graph={network} closed={closed} onRestore={stationId => dispatch({ type: 'restore-station', stationId })} onRestoreAll={() => dispatch({ type: 'restore-all' })} onExit={() => dispatch({ type: 'set-mode', mode: 'journey' })} />}
      {mode === 'journey' && (journey.phase === 'SELECT_ORIGIN' || journey.phase === 'SELECT_DESTINATION') && <div className="selection-prompt" key={journey.phase} aria-live="polite"><span className="eyebrow">{journey.phase === 'SELECT_ORIGIN' ? '01 / Your origin' : '02 / Your destination'}</span><h2>{journey.phase === 'SELECT_ORIGIN' ? 'Where are you starting?' : 'Where are you going?'}</h2><p>{journey.phase === 'SELECT_ORIGIN' ? 'Select a station. We’ll find the connection.' : 'From ' + originName + '. Select your destination.'}</p><span className="selection-hint"><span aria-hidden="true">↖</span> Explore the map</span></div>}
      {notice && !hasPlayback && <p className="selection-notice" role="status">{notice}</p>}
        {journey.phase === 'CONFIGURE' && <RouteSetup graph={network} route={journey} algorithm={algorithm} onChange={next => dispatch({ type: 'set-algorithm', algorithm: next })} onVisualize={() => dispatch({ type: 'visualize' })} onChangeOrigin={() => dispatch({ type: 'change-origin' })} onChangeDestination={() => dispatch({ type: 'change-destination' })} />}
      {journey.phase === 'SIMULATING' && (mode === 'journey' ? telemetry : <details className="execution-details"><summary>Live algorithm <span>{algorithm}</span></summary>{telemetry}</details>)}
      {journey.phase === 'SIMULATING' && <LiveCalculation graph={network} algorithm={algorithm} calculation={active ? calculation : null} />}
      {journey.phase === 'RESULT' && <RouteResult graph={network} state={visibleState} route={journey} algorithm={algorithm} closed={closed} executionDetails={telemetry} onReplay={() => dispatch({ type: 'replay' })} onNewJourney={() => dispatch({ type: 'new-journey' })} onRestoreAll={() => dispatch({ type: 'restore-all' })} />}
    </aside>
    {notice && journey.phase === 'SIMULATING' && <div className="reroute-notice" key={run?.id} role="status"><span className="eyebrow">Route disrupted</span><p>Recalculating…</p></div>}
    {hasPlayback && <PlaybackControls completed={journey.phase === 'RESULT'} isPlaying={simulation.isPlaying} cursor={simulation.cursor} eventCount={simulation.eventCount} speed={simulation.speed} onPlay={simulation.play} onPause={simulation.pause} onStep={simulation.step} onReset={() => dispatch({ type: 'reset' })} onSpeedChange={simulation.setPlaybackSpeed} />}
    <details className="line-key"><summary aria-label="Metro line legend" title="Metro line legend"><span className="line-key-swatches" aria-hidden="true">{network.lines.map(line => <i key={line.id} style={{ backgroundColor: line.color }} />)}</span></summary><div>{network.lines.map(line => <span key={line.id}><i style={{ backgroundColor: line.color }} />{line.name}</span>)}</div></details>
    <span className="map-guidance">Hover or tab to explore <span aria-hidden="true">·</span> 24 stations / 3 lines</span>
    <span className="touch-guidance">Swipe the map to explore</span>
  </main>
}
