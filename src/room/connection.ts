import { joinRoom } from 'trystero'
import { apply, viewFor, type Message, type RoomState, type RoomView } from './room'

// Star topology over Trystero (Nostr signaling), see ADR 0001.
// The Facilitator's browser is the hub: it says hello to each peer, receives
// their messages, runs them through `apply`, and sends each peer only its own
// `viewFor`. Participants talk only to the hub.

const APP_ID = 'intrepidd-workshop-tools'
const HUB_TIMEOUT_MS = 15_000

type Envelope = { participantId: string; message: Message }
type Hello = { hub: true }

function connect(roomId: string) {
  const room = joinRoom({ appId: APP_ID }, roomId)
  return {
    room,
    hello: room.makeAction<Hello>('hello'),
    toHub: room.makeAction<Envelope>('msg'),
    view: room.makeAction<RoomView>('view'),
  }
}

export type Hub = { leave: () => void }

/** Run the Room as its Facilitator. `onChange` fires with every new state. */
export function hostRoom(roomId: string, initial: RoomState, onChange: (state: RoomState) => void): Hub {
  const { room, hello, toHub, view } = connect(roomId)
  const peers = new Map<string, string>() // Trystero peer ID -> Participant ID

  // After a Facilitator refresh nobody is connected yet; they come back on their own.
  let state = initial.order
    .filter((id) => id !== initial.facilitatorId)
    .reduce((s, id) => apply(s, { type: 'leave' }, id), initial)
  onChange(state)

  const update = (next: RoomState) => {
    if (next === state) return
    state = next
    onChange(state)
    for (const [peerId, participantId] of peers) {
      void view.send(viewFor(state, participantId), { target: peerId })
    }
  }

  room.onPeerJoin(({ peerId }) => void hello.send({ hub: true }, { target: peerId }))

  toHub.onMessage((data, { peerId }) => {
    if (typeof data !== 'object' || data === null || typeof data.participantId !== 'string') return
    const known = peers.get(peerId)
    if (known && known !== data.participantId) return // a peer can't speak for someone else
    peers.set(peerId, data.participantId)
    update(apply(state, data.message, data.participantId))
  })

  room.onPeerLeave(({ peerId }) => {
    const participantId = peers.get(peerId)
    if (!participantId) return
    peers.delete(peerId)
    const stillHere = [...peers.values()].includes(participantId) // e.g. same person, two tabs
    if (!stillHere) update(apply(state, { type: 'leave' }, participantId))
  })

  return { leave: () => void room.leave() }
}

export type ParticipantStatus = 'connecting' | 'connected' | 'unreachable'

export type ParticipantConnection = { leave: () => void }

/** Join a Room as a Participant. Reconnects by itself when the Facilitator comes back. */
export function joinAsParticipant(
  roomId: string,
  participantId: string,
  name: string,
  onView: (view: RoomView) => void,
  onStatus: (status: ParticipantStatus) => void,
): ParticipantConnection {
  const { room, hello, toHub, view } = connect(roomId)
  let hubPeerId: string | null = null

  onStatus('connecting')
  const timer = setTimeout(() => onStatus('unreachable'), HUB_TIMEOUT_MS)

  hello.onMessage((_, { peerId }) => {
    hubPeerId = peerId
    void toHub.send({ participantId, message: { type: 'join', name } }, { target: peerId })
  })

  view.onMessage((data, { peerId }) => {
    if (peerId !== hubPeerId) return
    clearTimeout(timer)
    onStatus('connected')
    onView(data)
  })

  room.onPeerLeave(({ peerId }) => {
    if (peerId !== hubPeerId) return
    hubPeerId = null
    clearTimeout(timer)
    onStatus('unreachable')
  })

  return {
    leave: () => {
      clearTimeout(timer)
      void room.leave()
    },
  }
}
