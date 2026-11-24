// Everything the app says to screen readers goes through here: one polite and one
// assertive region, mounted once by Announcer.svelte (docs/accessibility.md, rules 1–4).

export const regions = $state({ polite: '', alert: '' })

/** Polite message, now. Clears first so repeating the same text is still announced. */
export function announce(text: string): void {
  regions.polite = ''
  setTimeout(() => (regions.polite = text), 100)
}

/** Assertive message: failures only. */
export function alertNow(text: string): void {
  regions.alert = ''
  setTimeout(() => (regions.alert = text), 100)
}

const COALESCE_MS = 2000
let pending: string[] = []
let timer: ReturnType<typeof setTimeout> | undefined

/**
 * Peer events (joins, answers, Entries) are batched and spoken as one message
 * every ~2s, so a burst of activity doesn't flood the screen reader. Later
 * messages with the same `key` replace earlier ones (e.g. only the latest count).
 */
export function announceSoon(text: string, key = text): void {
  pending = pending.filter((m) => !m.startsWith(`${key}\u0000`))
  pending.push(`${key}\u0000${text}`)
  clearTimeout(timer)
  timer = setTimeout(() => {
    announce(pending.map((m) => m.split('\u0000')[1]).join('. '))
    pending = []
  }, COALESCE_MS)
}
