// Small feedback helpers: haptics, confetti and stable colors for people.

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** A short haptic tap where supported (Android; iOS Safari ignores it). */
export function tap(ms = 10): void {
  if (!reducedMotion()) navigator.vibrate?.(ms)
}

const CONFETTI_COLORS = ['#ffb8a8', '#ffd59e', '#f9e6a1', '#cfe8b4', '#a9dcc9', '#d9cdf5', '#bfdcf6', '#f7c9de']

/** Two pastel confetti bursts from the sides. Loaded on demand; skipped under reduced motion. */
export async function celebrate(): Promise<void> {
  if (reducedMotion()) return
  const { default: confetti } = await import('canvas-confetti')
  const shot = { particleCount: 70, spread: 70, startVelocity: 45, colors: CONFETTI_COLORS, disableForReducedMotion: true }
  confetti({ ...shot, angle: 60, origin: { x: 0, y: 0.7 } })
  setTimeout(() => confetti({ ...shot, angle: 120, origin: { x: 1, y: 0.7 } }), 150)
}

const PERSON_COLORS = ['var(--pastel-a)', 'var(--pastel-b)', 'var(--pastel-c)', 'var(--value-2)', 'var(--value-4)', 'var(--value-5)']

/** The same pastel for the same name on every screen. */
export function personColor(name: string): string {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0
  return PERSON_COLORS[h % PERSON_COLORS.length]
}

export function initials(name: string): string {
  const parts = name.trim().split(/[\s-]+/).filter(Boolean)
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.trim().slice(0, 2)).toUpperCase()
}
