/**
 * Which Participant each Trystero peer speaks for, as the hub sees it.
 * A peer is bound to one Participant ID on its first message and can never
 * switch. The Participant ID a peer presents is its credential (it lives in
 * that browser's localStorage), so a reconnecting Participant gets their
 * place back, but nobody else can claim it while they are connected.
 */

/** Trystero peer ID -> Participant ID. */
export type PeerBindings = ReadonlyMap<string, string>

/**
 * Returns the bindings with `peerId` bound to `participantId`, the same
 * bindings if it already was, or null if the peer may not speak as them.
 */
export function bindPeer(
  bindings: PeerBindings,
  peerId: string,
  participantId: string,
  facilitatorId: string,
): PeerBindings | null {
  const bound = bindings.get(peerId)
  if (bound !== undefined) return bound === participantId ? bindings : null
  if (participantId === facilitatorId) return null // the Facilitator only acts locally
  if ([...bindings.values()].includes(participantId)) return null // e.g. a second tab, or an impostor
  return new Map(bindings).set(peerId, participantId)
}

/** Forgets a peer that left, and tells who it was speaking for, if anyone. */
export function unbindPeer(
  bindings: PeerBindings,
  peerId: string,
): { bindings: PeerBindings; participantId: string | null } {
  const participantId = bindings.get(peerId)
  if (participantId === undefined) return { bindings, participantId: null }
  const next = new Map(bindings)
  next.delete(peerId)
  return { bindings: next, participantId }
}
