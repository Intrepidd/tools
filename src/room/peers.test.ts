import { describe, expect, it } from 'vitest'
import { bindPeer, unbindPeer, type PeerBindings } from './peers'

const FACILITATOR = 'fac-1'
const none: PeerBindings = new Map()

describe('binding Trystero peers to Participant IDs on the hub', () => {
  it('binds a new peer to the Participant ID it first speaks as', () => {
    const bindings = bindPeer(none, 'peer-a', 'p-1', FACILITATOR)

    expect(bindings?.get('peer-a')).toBe('p-1')
  })

  it('keeps accepting a peer that keeps speaking as the same Participant', () => {
    const once = bindPeer(none, 'peer-a', 'p-1', FACILITATOR)!

    expect(bindPeer(once, 'peer-a', 'p-1', FACILITATOR)).toBe(once)
  })

  it('rejects a peer that later speaks as someone else', () => {
    const once = bindPeer(none, 'peer-a', 'p-1', FACILITATOR)!

    expect(bindPeer(once, 'peer-a', 'p-2', FACILITATOR)).toBeNull()
  })

  it("never lets a remote peer speak as the Facilitator", () => {
    expect(bindPeer(none, 'peer-a', FACILITATOR, FACILITATOR)).toBeNull()
  })

  it('rejects a Participant ID already bound to another connected peer', () => {
    const once = bindPeer(none, 'peer-a', 'p-1', FACILITATOR)!

    expect(bindPeer(once, 'peer-b', 'p-1', FACILITATOR)).toBeNull()
  })

  it('lets a Participant reconnect under their own ID once their old peer has left', () => {
    const once = bindPeer(none, 'peer-a', 'p-1', FACILITATOR)!
    const { bindings, participantId } = unbindPeer(once, 'peer-a')

    expect(participantId).toBe('p-1')
    expect(bindPeer(bindings, 'peer-b', 'p-1', FACILITATOR)?.get('peer-b')).toBe('p-1')
  })

  it('ignores a peer that leaves without ever speaking', () => {
    expect(unbindPeer(none, 'peer-a')).toEqual({ bindings: none, participantId: null })
  })
})
