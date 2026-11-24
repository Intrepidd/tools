/** Where a Hand sits, as percentages of a square stage (0–100 on both axes). */
export type Spot = { x: number; y: number }

/** Largest Hand, as a percentage of the stage width. */
const MAX_SIZE = 22
/** Radius of the center disc kept free for the average and distribution. */
const CENTER = 22

/** One ring, or two staggered rings (alternate Hands in and out) when the crowd gets big. */
const LAYOUTS = [
  { outer: 38, inner: 38 },
  { outer: 41, inner: 29 },
]

/**
 * Places `count` Hands around the stage center, first one at the top, clockwise.
 * `size` is the diameter each Hand may use without overlapping a neighbor, the stage edge or the center.
 */
export function placeHands(count: number): { spots: Spot[]; size: number } {
  const candidates = LAYOUTS.map(({ outer, inner }) => {
    const spots = Array.from({ length: count }, (_, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2
      const radius = i % 2 === 0 ? outer : inner
      return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) }
    })
    const size = Math.min(MAX_SIZE, 2 * (50 - outer), 2 * (inner - CENTER), closestPair(spots))
    return { spots, size }
  })
  return candidates.reduce((best, c) => (c.size > best.size ? c : best))
}

function closestPair(spots: Spot[]): number {
  let closest = Infinity
  for (const [i, a] of spots.entries()) {
    for (const b of spots.slice(i + 1)) closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y))
  }
  return closest
}
