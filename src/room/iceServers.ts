// The TURN relay config for peers that can't reach each other directly (phones,
// routers without NAT hairpinning, strict networks), see ADR 0001.
//
// shortcut: static Metered credentials ship in the public bundle, so anyone can spend
// the free plan's quota. Upgrade path: fetch short-lived credentials from Metered's
// TURN REST API (or a Worker) at join time.

const isIceServer = (value: unknown): value is RTCIceServer =>
  typeof value === 'object' &&
  value !== null &&
  'urls' in value &&
  (typeof value.urls === 'string' || (Array.isArray(value.urls) && value.urls.every((u) => typeof u === 'string')))

/**
 * Parse the JSON ICE servers array (Metered's "ICE Servers Array") from build env.
 * Unset means STUN only; anything malformed warns and also means STUN only, since a
 * bad entry would make every RTCPeerConnection throw.
 */
export function parseIceServers(raw: string | undefined): RTCIceServer[] | undefined {
  if (!raw) return undefined
  let servers: unknown
  try {
    servers = JSON.parse(raw)
  } catch {
    servers = undefined
  }
  if (Array.isArray(servers) && servers.length > 0 && servers.every(isIceServer)) return servers
  console.warn('[room] VITE_ICE_SERVERS is not a JSON array of ICE servers, falling back to STUN only')
  return undefined
}
