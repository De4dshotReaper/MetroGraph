import type { MetroGraph } from '../types/graph.ts'

export function countTransfers(graph: MetroGraph, connectionIds: readonly string[]): number {
  let previous: string | undefined
  let transfers = 0
  for (const id of connectionIds) {
    const line = graph.connections.find(edge => edge.id === id)?.lineId
    if (previous !== undefined && line !== previous) transfers++
    previous = line
  }
  return transfers
}
