import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseIceServers } from './iceServers'

const turn = { urls: 'turn:relay.example:443', username: 'u', credential: 'c' }

describe('parsing the TURN relay config from build env', () => {
  afterEach(() => vi.restoreAllMocks())

  it('means STUN only, quietly, when unset or empty', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(parseIceServers(undefined)).toBeUndefined()
    expect(parseIceServers('')).toBeUndefined()
    expect(warn).not.toHaveBeenCalled()
  })

  it('accepts an array of ICE servers, single or multiple urls', () => {
    const servers = [{ urls: 'stun:relay.example:80' }, turn, { ...turn, urls: ['turn:a:80', 'turns:a:443'] }]

    expect(parseIceServers(JSON.stringify(servers))).toEqual(servers)
  })

  it.each([
    ['invalid JSON', '[{urls: "turn:x"}]'],
    ['an object, not an array', JSON.stringify({ iceServers: [turn] })],
    ['an empty array', '[]'],
    ['a non-object entry', JSON.stringify([turn, 1])],
    ['an entry without urls', JSON.stringify([turn, {}])],
    ['non-string urls', JSON.stringify([{ urls: [42] }])],
  ])('warns and means STUN only on %s', (_, raw) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(parseIceServers(raw)).toBeUndefined()
    expect(warn).toHaveBeenCalledOnce()
  })
})
