import { describe, expect, it } from 'vitest'
import { placeHands } from './handCircle'

const round = (n: number) => Math.round(n * 10) / 10

describe('placeHands', () => {
  it('spreads a few Hands evenly on one circle, starting at the top and going clockwise', () => {
    const { spots } = placeHands(4)

    expect(spots.map((s) => [round(s.x), round(s.y)])).toEqual([
      [50, 12],
      [88, 50],
      [50, 88],
      [12, 50],
    ])
  })

  it('keeps Hands big when few, and still readable at 30', () => {
    expect(placeHands(3).size).toBeGreaterThanOrEqual(20)
    expect(placeHands(30).size).toBeGreaterThanOrEqual(11)
    expect(placeHands(12).size).toBeGreaterThan(placeHands(30).size)
  })

  it('leaves room in the center for the average and distribution', () => {
    for (const count of [1, 5, 12, 30]) {
      const { spots, size } = placeHands(count)
      const nearest = Math.min(...spots.map((s) => Math.hypot(s.x - 50, s.y - 50)))
      expect(nearest - size / 2).toBeGreaterThanOrEqual(22)
    }
  })

  it.each([1, 2, 3, 8, 15, 20, 30])('keeps %i Hands apart and inside the stage', (count) => {
    const { spots, size } = placeHands(count)

    for (const [i, a] of spots.entries()) {
      expect(a.x - size / 2).toBeGreaterThanOrEqual(0)
      expect(a.x + size / 2).toBeLessThanOrEqual(100)
      expect(a.y - size / 2).toBeGreaterThanOrEqual(0)
      expect(a.y + size / 2).toBeLessThanOrEqual(100)
      for (const b of spots.slice(i + 1)) {
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(size)
      }
    }
  })
})
