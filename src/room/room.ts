/**
 * The Room's pure logic core. The Facilitator's browser holds a RoomState and is
 * the only authority on it (ADR 0001): every message from a peer goes through
 * `apply`, and each peer is sent only `viewFor` itself.
 *
 * Presence (join/leave) is shared by every Activity. Activity-specific messages
 * and views branch on `state.activity`; none exist yet.
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
}

export type PresenceMessage = { type: 'join'; name: string } | { type: 'leave' }

export type Message = PresenceMessage

export type ParticipantView = { id: string; name: string; isFacilitator: boolean }

export type RoomView = {
  activity: Activity
  /** The viewer, or null if they have not joined. */
  me: ParticipantView | null
  /** Connected people, Facilitator included, in order of first join. */
  participants: ParticipantView[]
}

export function createRoom(activity: Activity, facilitatorId: string, facilitatorName: string): RoomState {
  return {
    activity,
    facilitatorId,
    members: { [facilitatorId]: { name: cleanName(facilitatorName) || 'Facilitator', connected: true } },
    order: [facilitatorId],
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
    default:
      return state
  }
}

export function viewFor(state: RoomState, participantId: string): RoomView {
  const person = (id: string): ParticipantView => ({
    id,
    name: state.members[id].name,
    isFacilitator: id === state.facilitatorId,
  })
  return {
    activity: state.activity,
    me: state.members[participantId] ? person(participantId) : null,
    participants: state.order.filter((id) => state.members[id].connected).map(person),
  }
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
