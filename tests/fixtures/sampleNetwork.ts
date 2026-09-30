import type { MetroGraph } from '../../src/types/graph.ts'

/** Original foundation graph retained for independent algorithm regression tests. */
export const network = {
  lines: [
    { id: 'amber', name: 'Amber Line', color: '#d5ab67' },
    { id: 'blue', name: 'Blue Line', color: '#7ba6c9' },
  ],
  stations: [
    { id: 'west', name: 'West End', x: 80, y: 190, lineIds: ['amber'], isInterchange: false },
    { id: 'market', name: 'Market', x: 240, y: 190, lineIds: ['amber'], isInterchange: false },
    { id: 'central', name: 'Central', x: 400, y: 190, lineIds: ['amber', 'blue'], isInterchange: true },
    { id: 'east', name: 'East Park', x: 580, y: 190, lineIds: ['amber', 'blue'], isInterchange: true },
    { id: 'north', name: 'North Quay', x: 400, y: 70, lineIds: ['blue'], isInterchange: false },
    { id: 'south', name: 'South Bank', x: 490, y: 320, lineIds: ['blue'], isInterchange: false },
  ],
  connections: [
    { id: 'west-market', from: 'west', to: 'market', weight: 2, lineId: 'amber' },
    { id: 'market-central', from: 'market', to: 'central', weight: 2, lineId: 'amber' },
    { id: 'central-east', from: 'central', to: 'east', weight: 8, lineId: 'amber' },
    { id: 'north-central', from: 'north', to: 'central', weight: 3, lineId: 'blue' },
    { id: 'central-south', from: 'central', to: 'south', weight: 2, lineId: 'blue' },
    { id: 'south-east', from: 'south', to: 'east', weight: 2, lineId: 'blue' },
  ],
} as const satisfies MetroGraph
