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
