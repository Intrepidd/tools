import { describe, expect, it } from 'vitest'
import { initials, personColor } from './juice'

describe('initials', () => {
  it('takes the first letters of two words', () => expect(initials('Pierre-Emmanuel Durand')).toBe('PE'))
  it('takes two letters of a single name', () => expect(initials('léa')).toBe('LÉ'))
})

describe('personColor', () => {
  it('is stable for the same name', () => expect(personColor('Marie')).toBe(personColor('Marie')))
})
