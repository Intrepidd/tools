import { describe, expect, it } from 'vitest'
import { MAX_ENTRY_LENGTH, MAX_ENTRY_WORDS, MAX_QUESTION_LENGTH, apply, createRoom, viewFor } from './room'

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

describe('Word Cloud', () => {
  function cloudRoom() {
    let state = createRoom('cloud', FACILITATOR, 'Fiona')
    state = apply(state, { type: 'join', name: 'Paul' }, 'p-1')
    state = apply(state, { type: 'join', name: 'Rita' }, 'p-2')
    return state
  }

  it('lets the Facilitator start a round with a Prompt that everyone sees', () => {
    const state = apply(cloudRoom(), { type: 'startRound', prompt: '  One word for this sprint?  ' }, FACILITATOR)

    for (const viewer of [FACILITATOR, 'p-1']) {
      expect(viewFor(state, viewer).round).toMatchObject({ prompt: 'One word for this sprint?', revealed: false })
    }
  })

  function openRound() {
    return apply(cloudRoom(), { type: 'startRound', prompt: 'One word?' }, FACILITATOR)
  }

  function add(state: ReturnType<typeof openRound>, from: string, ...texts: string[]) {
    return texts.reduce((s, text) => apply(s, { type: 'addEntry', text }, from), state)
  }

  const mine = (state: ReturnType<typeof openRound>, viewer: string) =>
    viewFor(state, viewer).round?.myEntries.map((e) => e.text)

  it('lets a Participant add any number of Entries and see only their own', () => {
    let state = add(openRound(), 'p-1', 'Trust', '  focus  ', 'Trust')
    state = add(state, 'p-2', 'Chaos')

    expect(mine(state, 'p-1')).toEqual(['Trust', 'focus', 'Trust'])
    expect(mine(state, 'p-2')).toEqual(['Chaos'])
    expect(JSON.stringify(viewFor(state, 'p-2'))).not.toMatch(/Trust|focus/)
  })

  it('rejects Entries that are blank, longer than 30 characters or more than 3 words', () => {
    const longest = 'x'.repeat(MAX_ENTRY_LENGTH)
    let state = add(openRound(), 'p-1', 'ship it now', longest, '   ', 'x'.repeat(MAX_ENTRY_LENGTH + 1), 'one two three four')
    state = apply(state, { type: 'addEntry', text: 42 } as never, 'p-1')
    state = apply(state, { type: 'addEntry' } as never, 'p-1')

    expect(mine(state, 'p-1')).toEqual(['ship it now', longest])
    expect([MAX_ENTRY_LENGTH, MAX_ENTRY_WORDS]).toEqual([30, 3])
  })

  it('rejects Entries from someone who never joined, or with no open round', () => {
    const stranger = add(openRound(), 'stranger', 'Hello')
    expect(JSON.stringify(viewFor(stranger, FACILITATOR))).not.toContain('Hello')

    const noRound = add(cloudRoom(), 'p-1', 'Hello')
    expect(viewFor(noRound, 'p-1').round).toBeNull()
  })

  const idOf = (state: ReturnType<typeof openRound>, viewer: string, text: string) =>
    viewFor(state, viewer).round?.myEntries.find((e) => e.text === text)?.id ?? -1

  it('lets a Participant delete their own Entry', () => {
    let state = add(openRound(), 'p-1', 'Trust', 'Typo', 'Focus')
    state = apply(state, { type: 'removeEntry', id: idOf(state, 'p-1', 'Typo') }, 'p-1')

    expect(mine(state, 'p-1')).toEqual(['Trust', 'Focus'])
  })

  it("never lets anyone delete someone else's Entry, the Facilitator included", () => {
    let state = add(openRound(), 'p-1', 'Trust')
    const id = idOf(state, 'p-1', 'Trust')
    state = apply(state, { type: 'removeEntry', id }, 'p-2')
    state = apply(state, { type: 'removeEntry', id }, FACILITATOR)

    expect(mine(state, 'p-1')).toEqual(['Trust'])
  })

  const counts = (state: ReturnType<typeof openRound>, viewer: string) =>
    viewFor(state, viewer).round?.progress?.map(({ name, entries }) => ({ name, entries }))

  it("shows the Facilitator each person's Entry count, not counting themself as missing", () => {
    let state = add(openRound(), 'p-1', 'Trust', 'Focus')
    state = add(state, FACILITATOR, 'Calm')

    expect(counts(state, FACILITATOR)).toEqual([
      { name: 'Fiona', entries: 1 },
      { name: 'Paul', entries: 2 },
      { name: 'Rita', entries: 0 },
    ])
    expect(counts(openRound(), FACILITATOR)).toEqual([
      { name: 'Paul', entries: 0 },
      { name: 'Rita', entries: 0 },
    ])
  })

  it('keeps the count of a Participant who left, and drops them if they had none', () => {
    let state = add(openRound(), 'p-1', 'Trust')
    state = apply(state, { type: 'leave' }, 'p-1')
    state = apply(state, { type: 'leave' }, 'p-2')

    expect(counts(state, FACILITATOR)).toEqual([{ name: 'Paul', entries: 1 }])
  })

  it('does not show Entry counts to Participants', () => {
    const state = add(openRound(), 'p-1', 'Trust')

    expect(viewFor(state, 'p-2').round?.progress).toBeNull()
  })

  it("never lets any view depend on someone else's words before Reveal", () => {
    // Two Rooms where everyone submitted the same number of Entries, with different words.
    const a = add(add(add(openRound(), 'p-1', 'Trust', 'Focus'), FACILITATOR, 'Calm'), 'p-2', 'Chaos')
    const b = add(add(add(openRound(), 'p-1', 'Speed', 'Joy'), FACILITATOR, 'Rain'), 'p-2', 'Chaos')

    expect(viewFor(a, 'p-2')).toEqual(viewFor(b, 'p-2'))
    for (const viewer of [FACILITATOR, 'p-1']) {
      const withoutMine = (state: typeof a) => ({ ...viewFor(state, viewer).round, myEntries: null })
      expect(withoutMine(a)).toEqual(withoutMine(b))
    }
  })

  const reveal = (state: ReturnType<typeof openRound>) => apply(state, { type: 'reveal' }, FACILITATOR)

  it('reveals the Cloud to everyone: merged Entries with counts, most submitted first', () => {
    let state = add(openRound(), 'p-1', 'Focus', 'Trust')
    state = add(state, 'p-2', 'Trust', 'Chaos')
    state = add(state, FACILITATOR, 'Trust', 'Focus')
    state = reveal(state)

    for (const viewer of [FACILITATOR, 'p-1', 'p-2']) {
      const round = viewFor(state, viewer).round
      expect(round?.revealed).toBe(true)
      expect(round?.cloud).toEqual([
        { text: 'Trust', count: 3 },
        { text: 'Focus', count: 2 },
        { text: 'Chaos', count: 1 },
      ])
      expect(round?.progress).toBeNull()
    }
  })

  it('has no Cloud before Reveal', () => {
    expect(viewFor(add(openRound(), 'p-1', 'Trust'), FACILITATOR).round?.cloud).toBeNull()
  })

  it('reveals a round with no Entries as an empty Cloud', () => {
    expect(viewFor(reveal(openRound()), 'p-1').round?.cloud).toEqual([])
  })

  it('matches Entries that differ only by case, accents or surrounding spaces, without stemming', () => {
    let state = add(openRound(), 'p-1', 'Trust', 'trust ', 'trüst', '  TRUST', 'trusts')
    state = add(state, 'p-2', 'Café crème', 'cafe   CREME', 'Ship it')
    state = reveal(state)

    expect(viewFor(state, 'p-1').round?.cloud).toEqual([
      { text: 'Trust', count: 4 },
      { text: 'Café crème', count: 2 },
      { text: 'trusts', count: 1 },
      { text: 'Ship it', count: 1 },
    ])
  })

  it('shows each merged Entry with its most-submitted spelling, ties going to the earliest submission', () => {
    let state = add(openRound(), 'p-1', 'trust', 'Focus')
    state = add(state, 'p-2', 'Trust', 'Trust', 'focus', 'FOCUS')
    state = reveal(state)

    expect(viewFor(state, 'p-1').round?.cloud).toEqual([
      { text: 'Trust', count: 3 },
      { text: 'Focus', count: 3 },
    ])
  })

  it('counts the Entries of a Participant who left before Reveal', () => {
    let state = add(openRound(), 'p-1', 'Trust')
    state = apply(state, { type: 'leave' }, 'p-1')

    expect(viewFor(reveal(state), 'p-2').round?.cloud).toEqual([{ text: 'Trust', count: 1 }])
  })

  it('rejects a Reveal, or a round started, by a Participant', () => {
    expect(viewFor(apply(cloudRoom(), { type: 'startRound' }, 'p-1'), FACILITATOR).round).toBeNull()

    const state = apply(add(openRound(), 'p-1', 'Trust'), { type: 'reveal' }, 'p-1')
    expect(viewFor(state, 'p-2').round).toMatchObject({ revealed: false, cloud: null })
  })

  it('locks Entries after Reveal: no adding or deleting', () => {
    let state = reveal(add(openRound(), 'p-1', 'Trust'))
    state = add(state, 'p-1', 'Late')
    state = add(state, 'p-2', 'Trust')
    state = apply(state, { type: 'removeEntry', id: idOf(state, 'p-1', 'Trust') }, 'p-1')

    expect(viewFor(state, FACILITATOR).round?.cloud).toEqual([{ text: 'Trust', count: 1 }])
  })

  it('keeps only one round open at a time', () => {
    let state = add(openRound(), 'p-1', 'Trust')
    state = apply(state, { type: 'startRound', prompt: 'Another?' }, FACILITATOR)

    expect(viewFor(state, 'p-1').round).toMatchObject({ prompt: 'One word?', myEntries: [{ text: 'Trust' }] })
  })

  it('clears the round when the Facilitator starts a New round after Reveal', () => {
    let state = reveal(add(openRound(), 'p-1', 'Trust'))
    state = apply(state, { type: 'startRound', prompt: 'And now?' }, FACILITATOR)

    expect(viewFor(state, 'p-1').round).toEqual({
      prompt: 'And now?',
      revealed: false,
      myEntries: [],
      progress: null,
      cloud: null,
    })
    expect(counts(state, FACILITATOR)).toEqual([
      { name: 'Paul', entries: 0 },
      { name: 'Rita', entries: 0 },
    ])
  })

  it('rejects a New round started by a Participant', () => {
    let state = reveal(add(openRound(), 'p-1', 'Trust'))
    state = apply(state, { type: 'startRound', prompt: 'Mine?' }, 'p-1')

    expect(viewFor(state, 'p-2').round).toMatchObject({ prompt: 'One word?', revealed: true })
  })

  it('lets a late joiner see the open round and add Entries to it', () => {
    let state = apply(openRound(), { type: 'join', name: 'Lea' }, 'p-3')
    expect(viewFor(state, 'p-3').round).toMatchObject({ prompt: 'One word?', revealed: false, myEntries: [] })

    state = reveal(add(state, 'p-3', 'Hello'))
    expect(viewFor(state, 'p-3').round?.cloud).toEqual([{ text: 'Hello', count: 1 }])
  })

  it('lets a late joiner see the revealed Cloud', () => {
    let state = reveal(add(openRound(), 'p-1', 'Trust'))
    state = apply(state, { type: 'join', name: 'Lea' }, 'p-3')

    expect(viewFor(state, 'p-3').round?.cloud).toEqual([{ text: 'Trust', count: 1 }])
  })

  it('has no rounds in a Fist of Five Room, and no Votes in a Word Cloud Room', () => {
    const fist = apply(newRoom(), { type: 'startRound' }, FACILITATOR)
    expect(viewFor(fist, FACILITATOR).round).toBeNull()

    const cloud = apply(openRound(), { type: 'startVote' }, FACILITATOR)
    expect(viewFor(cloud, FACILITATOR).vote).toBeNull()
  })

  it("never shows anyone another person's Participant ID, before or after Reveal", () => {
    const PAUL = 'paul-secret-id'
    let state = apply(createRoom('cloud', FACILITATOR, 'Fiona'), { type: 'join', name: 'Paul' }, PAUL)
    state = add(apply(state, { type: 'startRound' }, FACILITATOR), PAUL, 'Trust')

    for (const s of [state, reveal(state)]) {
      expect(JSON.stringify(viewFor(s, FACILITATOR))).not.toContain(PAUL)
      expect(JSON.stringify(viewFor(s, PAUL))).not.toContain(FACILITATOR)
    }
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
