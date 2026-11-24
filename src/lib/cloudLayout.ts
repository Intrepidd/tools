import CloudLayout from 'd3-cloud'
import type { CloudEntry } from '../room/room'

/** Font size, in layout units, of the most-submitted Entry. */
export const MAX_SIZE = 96

/** Smallest font size, so a rare Entry stays readable next to a very popular one. */
export const MIN_SIZE = 16

/** An Entry's font size: proportional to its count, the top Entry at MAX_SIZE. */
export function entrySize(entry: CloudEntry, maxCount: number): number {
  return Math.max(MIN_SIZE, (MAX_SIZE * entry.count) / maxCount)
}

/** mulberry32: a tiny seeded PRNG returning numbers in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MARGIN = 8

export type Box = { x: number; y: number; width: number; height: number }

/** The viewBox around the placed words' bounds, with a margin. */
export function fitBox([min, max]: [{ x: number; y: number }, { x: number; y: number }]): Box {
  return {
    x: min.x - MARGIN,
    y: min.y - MARGIN,
    width: max.x - min.x + 2 * MARGIN,
    height: max.y - min.y + 2 * MARGIN,
  }
}

/** Fixed, so every client draws the same Cloud. */
const SEED = 20240611
/** Layout box (in layout units) that shapes the cloud: wider than tall, for a projected screen. */
const LAYOUT_SIZE: [number, number] = [800, 500]
/**
 * Arial and Helvetica share their metrics, so this measures the same on most
 * desktops; the layout is only identical where the same font is available.
 */
export const CLOUD_FONT = 'Helvetica, Arial, sans-serif'
export const CLOUD_WEIGHT = 700

export type PlacedEntry = CloudEntry & { x: number; y: number; size: number }
export type CloudPicture = { entries: PlacedEntry[]; box: Box }

/**
 * Packs the Cloud with d3-cloud, largest Entry first. Deterministic: the Cloud
 * comes in a stable order (count, then first submission) and placement uses a
 * fixed seed, so the same Cloud gives the same picture on every client. The
 * layout may grow past LAYOUT_SIZE so no Entry is ever dropped; the returned
 * box frames them all, for an SVG viewBox. Needs a canvas (browser only).
 */
export function layoutCloud(cloud: CloudEntry[]): CloudPicture {
  const layout = new CloudLayout().size(LAYOUT_SIZE).overflow(true).random(seededRandom(SEED))
  const maxCount = Math.max(1, ...cloud.map((e) => e.count))
  const entries: PlacedEntry[] = []
  for (const entry of cloud) {
    const sprite = layout.getSprite(entry.text, {
      size: entrySize(entry, maxCount),
      font: CLOUD_FONT,
      weight: CLOUD_WEIGHT,
      padding: 3,
      rotate: 0,
    })
    const word = sprite && layout.place(sprite)
    if (word) entries.push({ ...entry, x: word.x, y: word.y, size: word.size })
  }
  const bounds = layout.bounds()
  return { entries, box: bounds ? fitBox(bounds) : { x: 0, y: 0, width: 0, height: 0 } }
}
