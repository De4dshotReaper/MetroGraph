# MetroGraph

An interactive metro routing and graph-algorithm visualizer.
The application renders a fictional 24-station network across Azure (blue), Emerald
(green), and Amber (orange) lines, with 25 bidirectional connections and four
interchanges: Apex Central, Meridian, Grand Terminal, and Harbor Point.
Two independent loops provide alternate routes between city districts.

- Map-first journey selection with keyboard-accessible stations.
- BFS and Dijkstra playback with live frontier telemetry, stepping, and speed controls.
- Station closures, automatic rerouting, and explicit no-route results.
- A full-viewport charcoal interface with floating controls and compact route summaries.
- Responsive bottom sheets and a pannable mobile map with full-size station targets.

## Stack and development

React, strict TypeScript, Vite, Tailwind CSS, and custom SVG. No backend,
database, authentication, or graph visualization library.
Use Node.js 22.18+ (or Node.js 24+) and npm.

```sh
npm install
npm run dev
npm run build
npm test
npm run preview
```

`npm run dev` prints the local development URL. `build` checks TypeScript and
produces `dist/`; `preview` serves that production output. Tests use Node's
built-in test runner and TypeScript stripping, with no extra test dependency.

## Structure

```text
src/
  algorithms/       bfs.ts, dijkstra.ts, graphUtils.ts
  components/       MetroMap, StationNode, RouteSetup, AlgorithmTelemetry,
                    PlaybackControls, RouteResult, NetworkStatus, DisruptionPanel,
                    Intro, EdgeTravel
  data/network.ts   Immutable network and line display colors
  hooks/            useSimulation.ts, playbackState.ts, simulationState.ts
  state/            journey.ts, routeSummary.ts
  types/graph.ts    Graph, event, and visualization-state contracts
  App.tsx
  main.tsx
  index.css
tests/algorithms.test.ts
tests/network.test.ts
tests/closures.test.ts
tests/journey.test.ts
tests/playback.test.ts
tests/fixtures/sampleNetwork.ts
```

## Architecture

Graph data → pure algorithms → ordered events → simulation controller → React/SVG.

The network is a weighted graph with positive integer travel times of 2–8 minutes.
Connections are bidirectional; transfers at a shared station have no extra penalty.
Stable connection IDs distinguish edges in playback and reconstructed routes.
BFS = **Fewest Stops** (minimum connections); Dijkstra = **Fastest Route**
(minimum travel time). Both track predecessor
stations and exact edges, return deterministic discriminated-union events, and
never import React or schedule delays. Unknown endpoints and invalid weights
fail early. BFS ties follow input connection order; Dijkstra uses a sorted
frontier with insertion-order ties, sufficient for this small network.

Frontier events are snapshots (BFS priority is hop count; Dijkstra priority is
tentative travel time). `visited` means expansion is complete, or the destination
has been selected. Unreachable runs finish with `reachable: false` and no path.

The controller incrementally reduces one real event at a time. Play/Pause retains
the current state and elapsed event time; Step consumes exactly one event while
paused. Speeds of 0.5x, 1x and 2x affect presentation only. Edge exploration events
have a longer display interval to make direction readable; ordering is unchanged.
SVG layers separate base lines, explored edges, travelling highlights, final route,
and station states. Native Web Animations controls a directional SVG dash overlay,
including pause/resume and playback-rate changes. No animation library is used.

One useful journey is Apex Central → Harbor Point: BFS takes 4 connections / 20 minutes;
Dijkstra takes 5 connections / 10 minutes. Deliberate 8-minute corridors make
shorter journeys by stop count slower than alternatives around the loops.
Tests also verify Apex Central → Meridian (2 / 16 vs. 7 / 14) and Grand Terminal
→ Harbor Point (2 / 16 vs. 3 / 6), where values are connections / minutes.

Network tests check data integrity, schematic geometry, all 576 ordered station
pairs against an independent shortest-path oracle, and alternate journeys after
individually removing Apex Central or Grand Terminal. Terminal branches can still
be isolated by closures; redundancy is provided between the core interchanges.
The original six-station fixture remains only in the algorithm regression tests.

## Interaction and disruptions

The explicit state flow is INTRO → SELECT_ORIGIN → SELECT_DESTINATION → CONFIGURE
→ SIMULATING → RESULT. A title-only intro runs on page load; reduced motion shortens
it and removes travelling motion. New Journey and Reset never replay the intro.

Click a station (or use Tab and Enter/Space), then choose a different destination.
Select BFS / Fewest Stops or Dijkstra / Fastest Route and press **Visualize Route**.
Configuration allows changing either endpoint. The live queue/frontier, current
station, distances, visited count, and event counter reflect actual algorithm events.
Results show the reconstructed route, connections, minutes, and line-change transfers.
Reset returns to configuration with endpoints retained. Replay starts the same
journey again. New Journey clears endpoints but retains network disruptions.

**Network Disruptions** switches station clicks to closing/restoring stations.
Closures live in application state, never in `network.ts`. The pure routing API is
`bfs(graph, request, { closedStationIds })` (likewise `dijkstra`), where the optional
IDs are a read-only set. Closed vertices and all their incident edges are unavailable.
Closed endpoints return an ordinary unreachable completion, not an exception.

Once both endpoints exist, any closure or restoration restarts the selected
algorithm against the updated network, even during configuration or paused playback.
This also allows reopened stations to improve a route. A fresh run ID cancels stale
playback and completion actions. No-route results explain disconnected or closed
endpoints. Inspect disruptions to restore individual stations or **Restore All**.
Closures are session state and are cleared by a full page reload.

## Presentation and accessibility

Desktop keeps the map spatially stable as configuration, telemetry, and results
change. Interchanges retain labels; ordinary station names appear on hover or
keyboard focus. Selected, current, closed, and final-route stations stay labelled.
An expandable route list and line legend keep secondary information available.

At widths up to 880px, controls become bottom sheets and the map scrolls in both
directions rather than shrinking its touch targets. All station labels are visible
there. Long panel content scrolls within its surface, not the document.

CSS supplies restrained entrance, selection, current-node, and result effects.
The existing Web Animations overlay follows the relevant line color and keeps its
pause/speed semantics. Reduced-motion preferences shorten the intro and disable
decorative movement. Origin, destination, and closures have distinct shapes or
symbols as well as colors; interactive controls have visible keyboard focus.

Tests cover selection transitions, deterministic stepping/replay/speeds, unavailable
vertices, alternate routes, unreachable results, and base-data immutability, alongside
the existing network invariants and optimality checks. The network uses a subtle
fade entrance rather than a decorative map-draw sequence. No animation, icon, or
font dependency is required.
