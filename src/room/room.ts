/**
 * The Room's pure logic core. The Facilitator's browser holds a RoomState and is
 * the only authority on it (ADR 0001): every message from a peer goes through
 * `apply`, and each peer is sent only `viewFor` itself.
 *
 * Presence (join/leave) is shared by every Activity. Activity-specific messages
 * and views branch on `state.activity`: Fist of Five has Votes; Word Cloud has
 * nothing yet.
 */

export type Activity = 'fist' | 'cloud'

export const MAX_NAME_LENGTH = 40

type Member = { name: string; connected: boolean }

export type RoomState = {
  activity: Activity
  facilitatorId: string
  /** Everyone who ever joined, keyed by Participant ID. Kept after they leave. */
  members: Record<string, Member>
  /** Participant IDs in order of first join. */
  order: string[]
  /** The current Fist of Five Vote, or null before the first one. */
  vote: Vote | null
}

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

export type Message = PresenceMessage | FistMessage

export type ParticipantView = { id: string; name: string; isFacilitator: boolean }

export type RoomView = {
  activity: Activity
  /** The viewer, or null if they have not joined. */
  me: ParticipantView | null
  /** Connected people, Facilitator included, in order of first join. */
  participants: ParticipantView[]
  /** The current Fist of Five Vote as this viewer may see it. */
  vote: VoteView | null
}

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

export type Hand = { id: string; name: string; value: number }

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
    members: { [facilitatorId]: { name: cleanName(facilitatorName) || 'Facilitator', connected: true } },
    order: [facilitatorId],
    vote: null,
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
    case 'answer':
      return answer(state, message, from)
    case 'reveal':
      return from === state.facilitatorId && state.vote
        ? { ...state, vote: { ...state.vote, revealed: true } }
        : state
    default:
      return state
  }
}

export function viewFor(state: RoomState, participantId: string): RoomView {
  const person = personIn(state)
  return {
    activity: state.activity,
    me: state.members[participantId] ? person(participantId) : null,
    participants: state.order.filter((id) => state.members[id].connected).map(person),
    vote: state.vote ? voteView(state, state.vote, participantId) : null, // absent in Rooms saved before Votes existed
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
            .filter((id) => id !== state.facilitatorId && state.members[id].connected && !hasAnswered(id))
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
    .map((id) => ({ id, name: state.members[id].name, value: vote.answers[id] }))
  const distribution = [1, 2, 3, 4, 5].map((n) => hands.filter((h) => h.value === n).length)
  const average = hands.length ? hands.reduce((sum, h) => sum + h.value, 0) / hands.length : null
  return { hands, average, distribution }
}

function personIn(state: RoomState) {
  return (id: string): ParticipantView => ({
    id,
    name: state.members[id].name,
    isFacilitator: id === state.facilitatorId,
  })
}

/** Opens a Vote, or a New Vote that replaces a revealed one. */
function startVote(state: RoomState, message: { question?: unknown }): RoomState {
  if (state.activity !== 'fist' || (state.vote && !state.vote.revealed)) return state
  const question = typeof message.question === 'string' ? message.question.trim() : ''
  return { ...state, vote: { question, revealed: false, answers: {} } }
}

function answer(state: RoomState, message: { value?: unknown }, from: string): RoomState {
  const { vote } = state
  const { value } = message
  if (!vote || vote.revealed || !state.members[from]) return state
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) return state
  return { ...state, vote: { ...vote, answers: { ...vote.answers, [from]: value } } }
}

function join(state: RoomState, message: { name: unknown }, from: string): RoomState {
  if (typeof message.name !== 'string') return state
  const name = cleanName(message.name)
  if (!name) return state
  return {
    ...state,
    members: { ...state.members, [from]: { name, connected: true } },
    order: state.order.includes(from) ? state.order : [...state.order, from],
  }
}

function leave(state: RoomState, from: string): RoomState {
  const member = state.members[from]
  if (!member) return state
  return { ...state, members: { ...state.members, [from]: { ...member, connected: false } } }
}

function cleanName(name: string): string {
  return name.trim().slice(0, MAX_NAME_LENGTH)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
