import { describe, expect, it } from 'vitest'
import { MAX_QUESTION_LENGTH, apply, createRoom, viewFor } from './room'

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

    const people = viewFor(state, FACILITATOR).participants
    expect(people.map((p) => p.name)).toEqual(['Fiona', 'Sam', 'Sam'])
    expect(new Set(people.map((p) => p.key)).size).toBe(3)
  })

  it('tells each viewer who they are and who the Facilitator is', () => {
    const state = apply(newRoom(), { type: 'join', name: 'Paul' }, 'p-1')

    const paulView = viewFor(state, 'p-1')
    expect(paulView.me).toMatchObject({ name: 'Paul', isFacilitator: false })
    expect(paulView.participants.filter((p) => p.isFacilitator).map((p) => p.name)).toEqual(['Fiona'])
    expect(viewFor(state, FACILITATOR).me).toMatchObject({ name: 'Fiona', isFacilitator: true })
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

  it('cuts a question longer than the limit', () => {
    const state = apply(roomWithPaulAndRita(), { type: 'startVote', question: 'x'.repeat(500) }, FACILITATOR)

    expect(viewFor(state, 'p-1').vote?.question).toBe('x'.repeat(MAX_QUESTION_LENGTH))
    expect(MAX_QUESTION_LENGTH).toBe(200)
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

  const who = (people: { name: string }[] | undefined) => people?.map((p) => p.name)
  const hands = (results: { hands: { name: string; value: number }[] } | null | undefined) =>
    results?.hands.map(({ name, value }) => ({ name, value }))

  it('shows the Facilitator who has answered and who they are waiting on, not counting themself', () => {
    const state = apply(openVote(), { type: 'answer', value: 4 }, 'p-1')

    const progress = viewFor(state, FACILITATOR).vote?.progress
    expect(who(progress?.answered)).toEqual(['Paul'])
    expect(who(progress?.waitingOn)).toEqual(['Rita'])
  })

  it('lists the Facilitator as answered once they vote', () => {
    const state = apply(openVote(), { type: 'answer', value: 4 }, FACILITATOR)

    expect(who(viewFor(state, FACILITATOR).vote?.progress?.answered)).toEqual(['Fiona'])
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
    expect(who(progress?.waitingOn)).toEqual([])
    expect(who(progress?.answered)).toEqual(['Paul'])
  })

  it('reveals every Hand with its name, the average and the 1-5 distribution, even with missing answers', () => {
    let state = apply(openVote(), { type: 'answer', value: 4 }, 'p-1')
    state = apply(state, { type: 'answer', value: 1 }, FACILITATOR)
    state = apply(state, { type: 'reveal' }, FACILITATOR)

    for (const viewer of [FACILITATOR, 'p-1', 'p-2']) {
      const vote = viewFor(state, viewer).vote
      expect(vote?.revealed).toBe(true)
      expect(hands(vote?.results)).toEqual([
        { name: 'Fiona', value: 1 },
        { name: 'Paul', value: 4 },
      ])
      expect(vote?.results).toMatchObject({ average: 2.5, distribution: [1, 0, 0, 1, 0] })
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

    expect(hands(viewFor(state, 'p-2').vote?.results)).toEqual([{ name: 'Paul', value: 3 }])
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

    expect(hands(viewFor(state, FACILITATOR).vote?.results)).toEqual([{ name: 'Paul', value: 3 }])
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
    expect(who(viewFor(state, FACILITATOR).vote?.progress?.waitingOn)).toEqual(['Paul', 'Rita'])
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
    expect(hands(viewFor(state, 'p-3').vote?.results)).toEqual([{ name: 'Lea', value: 5 }])
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

describe('identity', () => {
  // Distinctive IDs so a substring search can't match anything else in a view.
  const PAUL = 'paul-secret-id'
  const RITA = 'rita-secret-id'

  function answeredRoom() {
    let state = apply(newRoom(), { type: 'join', name: 'Paul' }, PAUL)
    state = apply(state, { type: 'join', name: 'Rita' }, RITA)
    state = apply(state, { type: 'startVote', question: 'Ship it?' }, FACILITATOR)
    state = apply(state, { type: 'answer', value: 4 }, PAUL)
    state = apply(state, { type: 'answer', value: 2 }, FACILITATOR)
    return state
  }

  it("never shows anyone another person's Participant ID, before or after Reveal", () => {
    const open = answeredRoom()
    const revealed = apply(open, { type: 'reveal' }, FACILITATOR)
    const everyone = [FACILITATOR, PAUL, RITA]

    for (const state of [open, revealed]) {
      for (const viewer of everyone) {
        const json = JSON.stringify(viewFor(state, viewer))
        for (const other of everyone.filter((id) => id !== viewer)) expect(json).not.toContain(other)
      }
    }
  })

  it('gives each person a distinct key that marks the viewer in the list and their Hand', () => {
    const state = apply(answeredRoom(), { type: 'reveal' }, FACILITATOR)
    const view = viewFor(state, PAUL)

    const keys = view.participants.map((p) => p.key)
    expect(new Set(keys).size).toBe(3)
    expect(view.participants.find((p) => p.key === view.me?.key)?.name).toBe('Paul')
    expect(view.vote?.results?.hands.find((h) => h.key === view.me?.key)?.value).toBe(4)
  })
})
