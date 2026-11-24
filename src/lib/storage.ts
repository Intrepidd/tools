import type { RoomState } from '../room/room'

// Everything the browser remembers. localStorage can throw (private mode,
// blocked storage), so every access is guarded and falls back gracefully.

const PARTICIPANT_ID = 'workshop:participantId'
const DISPLAY_NAME = 'workshop:displayName'
const roomKey = (roomId: string) => `workshop:room:${roomId}`
const joinedKey = (roomId: string) => `workshop:joined:${roomId}`

export function randomId(bytes = 16): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

function read(store: Storage, key: string): string | null {
  try {
    return store.getItem(key)
  } catch {
    return null
  }
}

function write(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value)
  } catch {
    // Not fatal: the app still works, it just won't remember.
  }
}

let fallbackParticipantId: string | null = null

/** This browser's Participant ID, created on first use. */
export function participantId(): string {
  const stored = read(localStorage, PARTICIPANT_ID)
  if (stored) return stored
  const id = fallbackParticipantId ?? randomId()
  fallbackParticipantId = id
  write(localStorage, PARTICIPANT_ID, id)
  return id
}

export function savedDisplayName(): string {
  return read(localStorage, DISPLAY_NAME) ?? ''
}

export function saveDisplayName(name: string): void {
  write(localStorage, DISPLAY_NAME, name.trim())
}

/** The Room state this browser holds as Facilitator, if any. */
export function loadRoomState(roomId: string): RoomState | null {
  const raw = read(localStorage, roomKey(roomId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as RoomState
  } catch {
    return null
  }
}

export function saveRoomState(roomId: string, state: RoomState): void {
  write(localStorage, roomKey(roomId), JSON.stringify(state))
}

/** Whether this tab already joined the Room, so a refresh rejoins without asking. */
export function hasJoined(roomId: string): boolean {
  return read(sessionStorage, joinedKey(roomId)) === '1'
}

export function markJoined(roomId: string): void {
  write(sessionStorage, joinedKey(roomId), '1')
}
