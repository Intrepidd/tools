import { describe, expect, it } from 'vitest'
import { apply, createRoom, viewFor } from './room'

const FACILITATOR = 'fac-1'

function newRoom() {
  return createRoom('fist', FACILITATOR, 'Fiona')
}

function names(view: ReturnType<typeof viewFor>) {
  return view.participants.map((p) => p.name)
}

describe('presence', () => {
  it('shows a Participant who joined to the Facilitator', () => {
    const state = apply(newRoom(), { type: 'join', name: 'Paul' }, 'p-1')

    expect(names(viewFor(state, FACILITATOR))).toEqual(['Fiona', 'Paul'])
  })

  it('drops a Participant who left from the list', () => {
    let state = apply(newRoom(), { type: 'join', name: 'Paul' }, 'p-1')
    state = apply(state, { type: 'join', name: 'Rita' }, 'p-2')
    state = apply(state, { type: 'leave' }, 'p-1')

    expect(names(viewFor(state, FACILITATOR))).toEqual(['Fiona', 'Rita'])
  })

  it('brings a Participant who reconnects back once, under their latest name', () => {
    let state = apply(newRoom(), { type: 'join', name: 'Paul' }, 'p-1')
    state = apply(state, { type: 'join', name: 'Rita' }, 'p-2')
    state = apply(state, { type: 'leave' }, 'p-1')
    state = apply(state, { type: 'join', name: 'Paul B.' }, 'p-1')

    expect(names(viewFor(state, FACILITATOR))).toEqual(['Fiona', 'Paul B.', 'Rita'])
  })

  it('allows two Participants with the same display name', () => {
    let state = apply(newRoom(), { type: 'join', name: 'Sam' }, 'p-1')
    state = apply(state, { type: 'join', name: 'Sam' }, 'p-2')

    expect(viewFor(state, FACILITATOR).participants.map((p) => [p.id, p.name])).toEqual([
      [FACILITATOR, 'Fiona'],
      ['p-1', 'Sam'],
      ['p-2', 'Sam'],
    ])
  })

  it('tells each viewer who they are and who the Facilitator is', () => {
    const state = apply(newRoom(), { type: 'join', name: 'Paul' }, 'p-1')

    const paulView = viewFor(state, 'p-1')
    expect(paulView.me).toEqual({ id: 'p-1', name: 'Paul', isFacilitator: false })
    expect(paulView.participants.filter((p) => p.isFacilitator).map((p) => p.name)).toEqual(['Fiona'])
    expect(viewFor(state, FACILITATOR).me).toEqual({ id: FACILITATOR, name: 'Fiona', isFacilitator: true })
  })

  it('trims display names and rejects blank ones', () => {
    let state = apply(newRoom(), { type: 'join', name: '  Paul  ' }, 'p-1')
    state = apply(state, { type: 'join', name: '   ' }, 'p-2')

    expect(names(viewFor(state, FACILITATOR))).toEqual(['Fiona', 'Paul'])
    expect(viewFor(state, 'p-2').me).toBeNull()
  })

  it('ignores malformed messages from the network', () => {
    const room = newRoom()
    const junk = [null, 'join', { type: 'join' }, { type: 'join', name: 42 }, { type: 'explode' }]

    for (const message of junk) {
      const state = apply(room, message as never, 'p-1')
      expect(names(viewFor(state, FACILITATOR))).toEqual(['Fiona'])
    }
  })
})
