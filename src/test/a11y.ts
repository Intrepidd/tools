// Shared helpers for accessibility tests (docs/accessibility.md, "How it stays true").
import axe from 'axe-core'

/** axe violations in `node`, as readable strings. Contrast is checked by hand: jsdom can't render colours. */
export async function axeViolations(node: Element): Promise<string[]> {
  const result = await axe.run(node, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)
}

/** jsdom has no matchMedia; components ask for prefers-reduced-motion. */
export function stubMatchMedia(reduced = false): void {
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
}
