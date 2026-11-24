/**
 * The Room's pure logic core. The Facilitator's browser holds a RoomState and is
 * the only authority on it (ADR 0001): every message from a peer goes through
 * `apply`, and each peer is sent only `viewFor` itself.
 *
 * Presence (join/leave) is shared by every Activity. Activity-specific messages
 * and views branch on `state.activity`: Fist of Five has Votes; Word Cloud has
 * rounds of Entries.
 */

export type Activity = 'fist' | 'cloud'

export const MAX_NAME_LENGTH = 40
export const MAX_QUESTION_LENGTH = 200
export const MAX_PROMPT_LENGTH = 200
export const MAX_ENTRY_LENGTH = 30
export const MAX_ENTRY_WORDS = 3

/** The values a Hand can show, in order. */
export const HAND_VALUES = [1, 2, 3, 4, 5] as const

type Participant = { name: string; connected: boolean }

export type RoomState = {
  activity: Activity
  facilitatorId: string
  /** Everyone who ever joined, keyed by Participant ID. Kept after they leave. */
  participants: Record<string, Participant>
  /** Participant IDs in order of first join. */
  order: string[]
  /** The current Fist of Five Vote, or null before the first one. */
  vote: Vote | null
  /** The current Word Cloud round, or null before the first one. */
  round?: Round | null
}

type Round = {
  prompt: string
  revealed: boolean
  /** In order of submission. Secret until Reveal, except to their author. */
  entries: Entry[]
  /**
   * The id each author's next Entry gets, keyed by Participant ID. Counted per
   * author, so a Participant's ids say nothing about how many Entries others
   * added. Never reused within a round.
   */
  nextEntryIds: Record<string, number>
}

/** An Entry is identified by (author, id): ids are only unique per author. */
type Entry = { id: number; author: string; text: string }

type Vote = {
  question: string
  revealed: boolean
  /** Values from 1 to 5, keyed by Participant ID. Secret until Reveal. */
  answers: Record<string, number>
}

export type PresenceMessage = { type: 'join'; name: string } | { type: 'leave' }

export type FistMessage =
  | { type: 'startVote'; question?: string }
  | { type: 'answer'; value: number }
  | { type: 'reveal' }

export type CloudMessage =
  | { type: 'startRound'; prompt?: string }
  | { type: 'addEntry'; text: string }
  | { type: 'removeEntry'; id: number }
  | { type: 'reveal' }

export type Message = PresenceMessage | FistMessage | CloudMessage

/**
 * A person as others see them. `key` is opaque and only meaningful within this
 * Room: it is never a Participant ID, so it can't be replayed to speak as them.
 */
export type ParticipantView = { key: number; name: string; isFacilitator: boolean }

export type RoomView = {
  activity: Activity
  /** The viewer, or null if they have not joined. */
  me: ParticipantView | null
  /** Connected people, Facilitator included, in order of first join. */
  participants: ParticipantView[]
  /** The current Fist of Five Vote as this viewer may see it. */
  vote: VoteView | null
  /** The current Word Cloud round as this viewer may see it. */
  round: RoundView | null
}

export type RoundView = {
  prompt: string
  revealed: boolean
  /** The viewer's own Entries, in order of submission. `id` (1, 2, 3… per author) is for deleting one. */
  myEntries: { id: number; text: string }[]
  /**
   * Facilitator only, before Reveal: how many Entries each person has, never
   * the words. Connected Participants and anyone with Entries, in order of first join.
   */
  progress: EntryCount[] | null
  /** Everyone, after Reveal only. */
  cloud: CloudEntry[] | null
}

/**
 * One merged Entry of the revealed Cloud: `text` is its most-submitted spelling
 * (ties go to the earliest submission) and `count` how many times it was
 * submitted, in any spelling. The Cloud lists them by count, then by earliest submission.
 */
export type CloudEntry = { text: string; count: number }

export type EntryCount = ParticipantView & { entries: number }

export type VoteView = {
  question: string
  revealed: boolean
  /** The viewer's own value, or null if they have not answered. */
  myValue: number | null
  /** Facilitator only, before Reveal: who has answered and who hasn't. Never values. */
  progress: { answered: ParticipantView[]; waitingOn: ParticipantView[] } | null
  /** Everyone, after Reveal only. */
  results: VoteResults | null
}

/** `key` matches the Participant's key in `RoomView.participants`. */
export type Hand = { key: number; name: string; value: number }

export type VoteResults = {
  /** One Hand per Participant who answered, in order of first join. */
  hands: Hand[]
  /** Null when nobody answered. */
  average: number | null
  /** How many Hands showed 1, 2, 3, 4 and 5 fingers. */
  distribution: number[]
}

export function createRoom(activity: Activity, facilitatorId: string, facilitatorName: string): RoomState {
  return {
    activity,
    facilitatorId,
    participants: { [facilitatorId]: { name: cleanName(facilitatorName) || 'Facilitator', connected: true } },
    order: [facilitatorId],
    vote: null,
    round: null,
  }
}

/** Returns the next state, or the same state if the message is not allowed. */
export function apply(state: RoomState, message: Message, from: string): RoomState {
  if (!isObject(message)) return state
  switch (message.type) {
    case 'join':
      return join(state, message, from)
    case 'leave':
      return leave(state, from)
    case 'startVote':
      return from === state.facilitatorId ? startVote(state, message) : state
    case 'startRound':
      return from === state.facilitatorId ? startRound(state, message) : state
    case 'addEntry':
      return addEntry(state, message, from)
    case 'removeEntry':
      return removeEntry(state, message, from)
    case 'answer':
      return answer(state, message, from)
    case 'reveal':
      return from === state.facilitatorId ? reveal(state) : state
    default:
      return state
  }
}

export function viewFor(state: RoomState, participantId: string): RoomView {
  const person = personIn(state)
  return {
    activity: state.activity,
    me: state.participants[participantId] ? person(participantId) : null,
    participants: state.order.filter((id) => state.participants[id].connected).map(person),
    vote: state.vote ? voteView(state, state.vote, participantId) : null, // absent in Rooms saved before Votes existed
    round: state.round ? roundView(state, state.round, participantId) : null,
  }
}

function voteView(state: RoomState, vote: Vote, viewer: string): VoteView {
  const person = personIn(state)
  const hasAnswered = (id: string) => id in vote.answers
  const progress =
    viewer === state.facilitatorId && !vote.revealed
      ? {
          answered: state.order.filter(hasAnswered).map(person),
          waitingOn: state.order
            .filter((id) => id !== state.facilitatorId && state.participants[id].connected && !hasAnswered(id))
            .map(person),
        }
      : null
  return {
    question: vote.question,
    revealed: vote.revealed,
    myValue: vote.answers[viewer] ?? null,
    progress,
    results: vote.revealed ? results(state, vote) : null,
  }
}

function results(state: RoomState, vote: Vote): VoteResults {
  const hands = state.order
    .filter((id) => id in vote.answers)
    .map((id) => ({ key: state.order.indexOf(id), name: state.participants[id].name, value: vote.answers[id] }))
  const distribution = HAND_VALUES.map((n) => hands.filter((h) => h.value === n).length)
  const average = hands.length ? hands.reduce((sum, h) => sum + h.value, 0) / hands.length : null
  return { hands, average, distribution }
}

function personIn(state: RoomState) {
  return (id: string): ParticipantView => ({
    key: state.order.indexOf(id), // position of first join: stable, and says nothing about the ID
    name: state.participants[id].name,
    isFacilitator: id === state.facilitatorId,
  })
}

/** Opens a Vote, or a New Vote that replaces a revealed one. */
function startVote(state: RoomState, message: { question?: unknown }): RoomState {
  if (state.activity !== 'fist' || (state.vote && !state.vote.revealed)) return state
  const question = typeof message.question === 'string' ? message.question.trim().slice(0, MAX_QUESTION_LENGTH) : ''
  return { ...state, vote: { question, revealed: false, answers: {} } }
}

function roundView(state: RoomState, round: Round, viewer: string): RoundView {
  const person = personIn(state)
  const countOf = (id: string) => round.entries.filter((e) => e.author === id).length
  const progress =
    viewer === state.facilitatorId && !round.revealed
      ? state.order
          .filter((id) => countOf(id) > 0 || (id !== state.facilitatorId && state.participants[id].connected))
          .map((id) => ({ ...person(id), entries: countOf(id) }))
      : null
  return {
    prompt: round.prompt,
    revealed: round.revealed,
    myEntries: round.entries.filter((e) => e.author === viewer).map(({ id, text }) => ({ id, text })),
    progress,
    cloud: round.revealed ? cloud(round) : null,
  }
}

function cloud(round: Round): CloudEntry[] {
  // Maps keep insertion order, so both are in order of first submission.
  const merged = new Map<string, Map<string, number>>()
  for (const { text } of round.entries) {
    const spellings = merged.get(matchKey(text)) ?? new Map<string, number>()
    merged.set(matchKey(text), spellings.set(text, (spellings.get(text) ?? 0) + 1))
  }
  const entries = [...merged.values()].map((spellings) => {
    let [text, best] = ['', 0]
    for (const [spelling, n] of spellings) if (n > best) [text, best] = [spelling, n]
    return { text, count: [...spellings.values()].reduce((a, b) => a + b, 0) }
  })
  return entries.sort((a, b) => b.count - a.count) // stable: ties keep first-submission order
}

/** Entries with the same key are the same Entry: case, accents and spacing don't count. */
function matchKey(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

function reveal(state: RoomState): RoomState {
  if (state.activity === 'fist' && state.vote) return { ...state, vote: { ...state.vote, revealed: true } }
  if (state.activity === 'cloud' && state.round) return { ...state, round: { ...state.round, revealed: true } }
  return state
}

/** Opens a round, or a New round that replaces a revealed one. */
function startRound(state: RoomState, message: { prompt?: unknown }): RoomState {
  if (state.activity !== 'cloud' || (state.round && !state.round.revealed)) return state
  const prompt = typeof message.prompt === 'string' ? message.prompt.trim().slice(0, MAX_PROMPT_LENGTH) : ''
  return { ...state, round: { prompt, revealed: false, entries: [], nextEntryIds: {} } }
}

function addEntry(state: RoomState, message: { text?: unknown }, from: string): RoomState {
  const { round } = state
  if (!round || round.revealed || !state.participants[from]) return state
  const text = cleanEntry(message.text)
  if (text === null) return state
  const id = round.nextEntryIds[from] ?? 1
  const entries = [...round.entries, { id, author: from, text }]
  return { ...state, round: { ...round, entries, nextEntryIds: { ...round.nextEntryIds, [from]: id + 1 } } }
}

function removeEntry(state: RoomState, message: { id?: unknown }, from: string): RoomState {
  const { round } = state
  if (!round || round.revealed) return state
  const entries = round.entries.filter((e) => !(e.id === message.id && e.author === from))
  return entries.length === round.entries.length ? state : { ...state, round: { ...round, entries } }
}

/**
 * An Entry as it will be stored: trimmed, with runs of spaces collapsed. Null
 * if it is blank or over the limits. Inputs use it too, to match `apply`.
 */
export function cleanEntry(text: unknown): string | null {
  if (typeof text !== 'string') return null
  const clean = text.normalize('NFC').trim().replace(/\s+/g, ' ')
  if (!clean || clean.length > MAX_ENTRY_LENGTH || clean.split(' ').length > MAX_ENTRY_WORDS) return null
  return clean
}

function answer(state: RoomState, message: { value?: unknown }, from: string): RoomState {
  const { vote } = state
  const { value } = message
  if (!vote || vote.revealed || !state.participants[from]) return state
  if (!isHandValue(value)) return state
  return { ...state, vote: { ...vote, answers: { ...vote.answers, [from]: value } } }
}

function isHandValue(value: unknown): value is number {
  return (HAND_VALUES as readonly unknown[]).includes(value)
}

function join(state: RoomState, message: { name: unknown }, from: string): RoomState {
  if (typeof message.name !== 'string') return state
  const name = cleanName(message.name)
  if (!name) return state
  return {
    ...state,
    participants: { ...state.participants, [from]: { name, connected: true } },
    order: state.order.includes(from) ? state.order : [...state.order, from],
  }
}

function leave(state: RoomState, from: string): RoomState {
  const participant = state.participants[from]
  if (!participant) return state
  return { ...state, participants: { ...state.participants, [from]: { ...participant, connected: false } } }
}

function cleanName(name: string): string {
  return name.trim().slice(0, MAX_NAME_LENGTH)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
