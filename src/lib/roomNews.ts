import type { CloudEntry, RoomView, VoteResults } from '../room/room'

/** What a screen reader user should hear when the Room view changes. */
export type News = {
  /** Phase changes, spoken right away. */
  now: string[]
  /** Peer activity, batched; a later item with the same key replaces an earlier one. */
  soon: { key: string; text: string }[]
}

/** "Ready?" + "Choose" → "Ready? Choose"; "Ready" → "Ready. Choose". */
const sentence = (text: string) => (/[.?!…]$/.test(text) ? text : `${text}.`)

const list = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

/**
 * Compares two successive views of the Room for the same viewer. Never reports
 * the viewer's own arrival; the viewer's own answers and Entries are announced
 * where they act, not here.
 */
export function roomNews(prev: RoomView | null, next: RoomView, isFacilitator: boolean): News {
  const news: News = { now: [], soon: [] }
  if (!prev) return news

  const me = next.me?.key
  const before = new Map(prev.participants.map((p) => [p.key, p.name]))
  const after = new Map(next.participants.map((p) => [p.key, p.name]))
  const joined = [...after].filter(([k]) => !before.has(k) && k !== me).map(([, n]) => n)
  const left = [...before].filter(([k]) => !after.has(k) && k !== me).map(([, n]) => n)
  if (joined.length) news.soon.push({ key: `joined:${joined.join()}`, text: `${list(joined)} joined` })
  if (left.length) news.soon.push({ key: `left:${left.join()}`, text: `${list(left)} left` })

  const pv = prev.vote
  const nv = next.vote
  if (nv && !nv.revealed && (!pv || pv.revealed)) {
    news.now.push(`${sentence(nv.question ? `Vote started: ${nv.question}` : 'Vote started')} Choose 1 to 5`)
  }
  if (nv?.revealed && pv && !pv.revealed) news.now.push('Revealing the hands')
  if (isFacilitator && nv?.progress && pv?.progress) {
    const answered = nv.progress.answered.length
    if (answered !== pv.progress.answered.length) {
      const total = answered + nv.progress.waitingOn.length
      news.soon.push({ key: 'answered', text: `${answered} of ${total} have answered` })
    }
  }

  const pr = prev.round
  const nr = next.round
  if (nr && !nr.revealed && (!pr || pr.revealed)) {
    news.now.push(`${sentence(nr.prompt ? `Round started: ${nr.prompt}` : 'Round started')} Add up to 3 words`)
  }
  if (nr?.revealed && pr && !pr.revealed) news.now.push('Revealing the Word Cloud')
  if (isFacilitator && nr?.progress && pr?.progress) {
    const total = nr.progress.reduce((s, p) => s + p.entries, 0)
    if (total !== pr.progress.reduce((s, p) => s + p.entries, 0)) {
      news.soon.push({ key: 'entries', text: `${total} ${total === 1 ? 'Entry' : 'Entries'} so far` })
    }
  }
  return news
}

/** One sentence for a revealed Vote. */
export function voteSummary(results: VoteResults): string {
  if (results.average === null) return 'Results: nobody answered this Vote'
  const top = Math.max(...results.distribution)
  const values = results.distribution.flatMap((n, i) => (n === top ? [i + 1] : []))
  const n = results.hands.length
  return (
    `Results: average ${results.average.toFixed(1)} out of 5 from ${n} ${n === 1 ? 'vote' : 'votes'}. ` +
    `Most common: ${list(values.map(String))}, ${top} ${top === 1 ? 'person' : 'people'}`
  )
}

/** One sentence for a revealed Word Cloud. */
export function cloudSummary(cloud: CloudEntry[]): string {
  if (!cloud.length) return 'Results: nobody added an Entry this round'
  const top = cloud.slice(0, 3).map((e) => `${e.text} (${e.count})`)
  return `Results: ${cloud.length} different ${cloud.length === 1 ? 'Entry' : 'Entries'}. Top: ${list(top)}`
}
