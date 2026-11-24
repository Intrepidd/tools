import { describe, expect, it } from 'vitest'
import { entrySize, fitBox, seededRandom } from './cloudLayout'

describe('entrySize', () => {
  it('sizes Entries in proportion to their count', () => {
    expect(entrySize({ text: 'Trust', count: 10 }, 10)).toBe(96)
    expect(entrySize({ text: 'Focus', count: 5 }, 10)).toBe(48)
  })

  it('keeps a rare Entry readable next to a very popular one', () => {
    expect(entrySize({ text: 'Odd one', count: 1 }, 40)).toBe(16)
  })

  it('shrinks a long top Entry so it fits the 2048px canvas d3-cloud draws it on', () => {
    // Bold 'M' is under one em wide, so 30 of them fit 2048px below 2048 / 30 ≈ 68px.
    const size = entrySize({ text: 'M'.repeat(30), count: 3 }, 3)
    expect(size).toBeLessThan(68)
    expect(size).toBeGreaterThanOrEqual(16)
  })

  it('scales every size down for a retry, never below the readable minimum', () => {
    expect(entrySize({ text: 'Trust', count: 10 }, 10, 0.5)).toBe(48)
    expect(entrySize({ text: 'Odd one', count: 1 }, 40, 0.5)).toBe(16)
  })
})

describe('fitBox', () => {
  it('frames the placed words with a margin, so the cloud scales to fit its container', () => {
    expect(
      fitBox([
        { x: -120, y: -40 },
        { x: 80, y: 30 },
      ]),
    ).toEqual({ x: -128, y: -48, width: 216, height: 86 })
  })
})

describe('seededRandom', () => {
  it('gives the same sequence for the same seed', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const first = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(first)
  })
})
