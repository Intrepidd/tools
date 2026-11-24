import type { Activity } from '../room/room'

export type Route = { page: 'home' } | { page: 'room'; activity: Activity; roomId: string }

const ROOM_HASH = /^#\/(fist|cloud)\/([A-Za-z0-9_-]{8,64})$/

export function parseRoute(hash: string): Route {
  const match = ROOM_HASH.exec(hash)
  if (!match) return { page: 'home' }
  return { page: 'room', activity: match[1] as Activity, roomId: match[2] }
}

export function roomHash(activity: Activity, roomId: string): string {
  return `#/${activity}/${roomId}`
}

export function roomLink(activity: Activity, roomId: string): string {
  return `${location.origin}${location.pathname}${roomHash(activity, roomId)}`
}

export const ACTIVITY_NAMES: Record<Activity, string> = {
  fist: 'Fist of Five',
  cloud: 'Word Cloud',
}
