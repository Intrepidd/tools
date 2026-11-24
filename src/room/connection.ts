import { joinRoom } from 'trystero'
import { bindPeer, unbindPeer, type PeerBindings } from './peers'
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

export type Hub = {
  /** Apply a message from the Facilitator themself. */
  send: (message: Message) => void
  leave: () => void
}

/** Run the Room as its Facilitator. `onChange` fires with every new state. */
export function runRoomAsFacilitator(roomId: string, initial: RoomState, onChange: (state: RoomState) => void): Hub {
  const { room, hello, toHub, view } = connect(roomId)
  let peers: PeerBindings = new Map()

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
    const bound = bindPeer(peers, peerId, data.participantId, state.facilitatorId)
    if (!bound) return // a peer can't speak for the Facilitator, or for anyone else already here
    peers = bound
    update(apply(state, data.message, data.participantId))
  })

  room.onPeerLeave(({ peerId }) => {
    const left = unbindPeer(peers, peerId)
    peers = left.bindings
    if (left.participantId) update(apply(state, { type: 'leave' }, left.participantId))
    // A refreshing Participant's new peer is refused until their old peer is seen leaving,
    // so greet every peer not yet bound again: they answer by joining once more.
    for (const other of Object.keys(room.getPeers())) {
      if (!peers.has(other)) void hello.send({ hub: true }, { target: other })
    }
  })

  return {
    send: (message) => update(apply(state, message, state.facilitatorId)),
    leave: () => void room.leave(),
  }
}

export type ParticipantStatus = 'connecting' | 'connected' | 'unreachable'

export type ParticipantConnection = {
  /** Send a message to the Facilitator. Dropped while the Room is unreachable. */
  send: (message: Message) => void
  leave: () => void
}

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

  // shortcut: whoever says hello first is trusted as the Room, so a malicious peer
  // that beats the Facilitator to it can pose as the Room. Upgrade path: the
  // Facilitator signs hello with a key whose fingerprint is in the Room URL.
  hello.onMessage((_, { peerId }) => {
    if (hubPeerId && hubPeerId !== peerId) return // only a new hub after the old one left (Facilitator refresh)
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
    send: (message) => {
      if (hubPeerId) void toHub.send({ participantId, message }, { target: hubPeerId })
    },
    leave: () => {
      clearTimeout(timer)
      void room.leave()
    },
  }
}
