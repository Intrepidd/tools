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

describe('Fist of Five', () => {
  function roomWithPaulAndRita() {
    let state = apply(newRoom(), { type: 'join', name: 'Paul' }, 'p-1')
    state = apply(state, { type: 'join', name: 'Rita' }, 'p-2')
    return state
  }

  it('lets the Facilitator start a Vote with a question that everyone sees', () => {
    const state = apply(roomWithPaulAndRita(), { type: 'startVote', question: 'Ship it?' }, FACILITATOR)

    expect(viewFor(state, 'p-1').vote).toMatchObject({ question: 'Ship it?', revealed: false })
    expect(viewFor(state, FACILITATOR).vote).toMatchObject({ question: 'Ship it?', revealed: false })
  })

  it('rejects a Vote started by a Participant', () => {
    const state = apply(roomWithPaulAndRita(), { type: 'startVote', question: 'Mine?' }, 'p-1')

    expect(viewFor(state, FACILITATOR).vote).toBeNull()
  })

  function openVote() {
    return apply(roomWithPaulAndRita(), { type: 'startVote', question: 'Ship it?' }, FACILITATOR)
  }

  it('shows a Participant their own value, and lets them change it until Reveal', () => {
    let state = apply(openVote(), { type: 'answer', value: 2 }, 'p-1')
    expect(viewFor(state, 'p-1').vote?.myValue).toBe(2)

    state = apply(state, { type: 'answer', value: 4 }, 'p-1')
    expect(viewFor(state, 'p-1').vote?.myValue).toBe(4)
    expect(viewFor(state, 'p-2').vote?.myValue).toBeNull()
  })

  it('rejects values outside 1 to 5 and answers with no open Vote', () => {
    let state = apply(openVote(), { type: 'answer', value: 3 }, 'p-1')
    for (const value of [0, 6, 2.5, '3', null]) {
      state = apply(state, { type: 'answer', value } as never, 'p-1')
    }
    expect(viewFor(state, 'p-1').vote?.myValue).toBe(3)

    const noVote = apply(roomWithPaulAndRita(), { type: 'answer', value: 3 }, 'p-1')
    expect(viewFor(noVote, 'p-1').vote).toBeNull()
  })

  it('rejects an answer from someone who never joined', () => {
    const state = apply(openVote(), { type: 'answer', value: 3 }, 'stranger')

    expect(JSON.stringify(viewFor(state, FACILITATOR))).not.toContain('stranger')
  })

  const ids = (people: { id: string }[] | undefined) => people?.map((p) => p.id)

  it('shows the Facilitator who has answered and who they are waiting on, not counting themself', () => {
    const state = apply(openVote(), { type: 'answer', value: 4 }, 'p-1')

    const progress = viewFor(state, FACILITATOR).vote?.progress
    expect(ids(progress?.answered)).toEqual(['p-1'])
    expect(ids(progress?.waitingOn)).toEqual(['p-2'])
    expect(progress?.answered[0].name).toBe('Paul')
  })

  it('lists the Facilitator as answered once they vote', () => {
    const state = apply(openVote(), { type: 'answer', value: 4 }, FACILITATOR)

    expect(ids(viewFor(state, FACILITATOR).vote?.progress?.answered)).toEqual([FACILITATOR])
  })

  it('does not show answer progress to Participants', () => {
    const state = apply(openVote(), { type: 'answer', value: 4 }, 'p-1')

    expect(viewFor(state, 'p-2').vote?.progress).toBeNull()
  })

  it('drops a disconnected Participant from the waiting list but keeps their answer', () => {
    let state = apply(openVote(), { type: 'answer', value: 4 }, 'p-1')
    state = apply(state, { type: 'leave' }, 'p-1')
    state = apply(state, { type: 'leave' }, 'p-2')

    const progress = viewFor(state, FACILITATOR).vote?.progress
    expect(ids(progress?.waitingOn)).toEqual([])
    expect(ids(progress?.answered)).toEqual(['p-1'])
  })

  it('reveals every Hand with its name, the average and the 1-5 distribution, even with missing answers', () => {
    let state = apply(openVote(), { type: 'answer', value: 4 }, 'p-1')
    state = apply(state, { type: 'answer', value: 1 }, FACILITATOR)
    state = apply(state, { type: 'reveal' }, FACILITATOR)

    for (const viewer of [FACILITATOR, 'p-1', 'p-2']) {
      const vote = viewFor(state, viewer).vote
      expect(vote?.revealed).toBe(true)
      expect(vote?.results).toEqual({
        hands: [
          { id: FACILITATOR, name: 'Fiona', value: 1 },
          { id: 'p-1', name: 'Paul', value: 4 },
        ],
        average: 2.5,
        distribution: [1, 0, 0, 1, 0],
      })
      expect(vote?.progress).toBeNull()
    }
  })

  it('reveals a Vote with no answers', () => {
    const state = apply(openVote(), { type: 'reveal' }, FACILITATOR)

    expect(viewFor(state, 'p-1').vote?.results).toEqual({ hands: [], average: null, distribution: [0, 0, 0, 0, 0] })
  })

  it('counts the Hand of a Participant who left before Reveal', () => {
    let state = apply(openVote(), { type: 'answer', value: 3 }, 'p-1')
    state = apply(state, { type: 'leave' }, 'p-1')
    state = apply(state, { type: 'reveal' }, FACILITATOR)

    expect(viewFor(state, 'p-2').vote?.results?.hands).toEqual([{ id: 'p-1', name: 'Paul', value: 3 }])
  })

  it('rejects a Reveal by a Participant', () => {
    let state = apply(openVote(), { type: 'answer', value: 3 }, 'p-1')
    state = apply(state, { type: 'reveal' }, 'p-1')

    expect(viewFor(state, 'p-2').vote).toMatchObject({ revealed: false, results: null })
  })

  it('locks values after Reveal', () => {
    let state = apply(openVote(), { type: 'answer', value: 3 }, 'p-1')
    state = apply(state, { type: 'reveal' }, FACILITATOR)
    state = apply(state, { type: 'answer', value: 5 }, 'p-1')
    state = apply(state, { type: 'answer', value: 5 }, 'p-2')

    expect(viewFor(state, FACILITATOR).vote?.results?.hands).toEqual([{ id: 'p-1', name: 'Paul', value: 3 }])
  })

  it('keeps only one Vote open at a time', () => {
    let state = apply(openVote(), { type: 'answer', value: 3 }, 'p-1')
    state = apply(state, { type: 'startVote', question: 'Another?' }, FACILITATOR)

    expect(viewFor(state, 'p-1').vote).toMatchObject({ question: 'Ship it?', myValue: 3 })
  })

  it('clears the previous Vote when the Facilitator starts a New Vote after Reveal', () => {
    let state = apply(openVote(), { type: 'answer', value: 3 }, 'p-1')
    state = apply(state, { type: 'reveal' }, FACILITATOR)
    state = apply(state, { type: 'startVote' }, FACILITATOR)

    expect(viewFor(state, 'p-1').vote).toEqual({
      question: '',
      revealed: false,
      myValue: null,
      progress: null,
      results: null,
    })
    expect(ids(viewFor(state, FACILITATOR).vote?.progress?.waitingOn)).toEqual(['p-1', 'p-2'])
  })

  it('rejects a New Vote started by a Participant', () => {
    let state = apply(openVote(), { type: 'reveal' }, FACILITATOR)
    state = apply(state, { type: 'startVote', question: 'Mine?' }, 'p-1')

    expect(viewFor(state, 'p-2').vote).toMatchObject({ question: 'Ship it?', revealed: true })
  })

  it('lets a late joiner see the open Vote and answer it', () => {
    let state = apply(openVote(), { type: 'join', name: 'Lea' }, 'p-3')
    expect(viewFor(state, 'p-3').vote).toMatchObject({ question: 'Ship it?', revealed: false, myValue: null })

    state = apply(state, { type: 'answer', value: 5 }, 'p-3')
    state = apply(state, { type: 'reveal' }, FACILITATOR)
    expect(viewFor(state, 'p-3').vote?.results?.hands).toEqual([{ id: 'p-3', name: 'Lea', value: 5 }])
  })

  it('lets a late joiner see revealed results', () => {
    let state = apply(openVote(), { type: 'answer', value: 2 }, 'p-1')
    state = apply(state, { type: 'reveal' }, FACILITATOR)
    state = apply(state, { type: 'join', name: 'Lea' }, 'p-3')

    expect(viewFor(state, 'p-3').vote?.results?.average).toBe(2)
  })

  it('has no Votes in a Word Cloud Room', () => {
    const state = apply(createRoom('cloud', FACILITATOR, 'Fiona'), { type: 'startVote' }, FACILITATOR)

    expect(viewFor(state, FACILITATOR).vote).toBeNull()
  })

  it("never lets any view depend on someone else's value before Reveal", () => {
    // Two Rooms that differ only in the values Paul and Fiona picked.
    const answers = (paul: number, fiona: number) =>
      apply(apply(openVote(), { type: 'answer', value: paul }, 'p-1'), { type: 'answer', value: fiona }, FACILITATOR)
    const a = answers(5, 1)
    const b = answers(2, 4)

    expect(viewFor(a, 'p-2')).toEqual(viewFor(b, 'p-2'))
    expect(viewFor(a, FACILITATOR)).not.toEqual(viewFor(b, FACILITATOR)) // her own value differs
    expect({ ...viewFor(a, FACILITATOR).vote, myValue: null }).toEqual({ ...viewFor(b, FACILITATOR).vote, myValue: null })
    expect({ ...viewFor(a, 'p-1').vote, myValue: null }).toEqual({ ...viewFor(b, 'p-1').vote, myValue: null })
  })
})
