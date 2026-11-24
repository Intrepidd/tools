import { describe, expect, it } from 'vitest'
import type { RoomView } from '../room/room'
import { cloudSummary, roomNews, voteSummary } from './roomNews'

const person = (key: number, name: string) => ({ key, name, isFacilitator: key === 0 })
const view = (over: Partial<RoomView> = {}): RoomView => ({
  activity: 'fist',
  me: person(0, 'Marie'),
  participants: [person(0, 'Marie')],
  vote: null,
  round: null,
  ...over,
})

describe('roomNews', () => {
  it('says nothing on the first view', () => {
    expect(roomNews(null, view(), true)).toEqual({ now: [], soon: [] })
  })

  it('names people who join and leave, never the viewer', () => {
    const prev = view({ participants: [person(0, 'Marie'), person(1, 'Hugo')] })
    const next = view({ participants: [person(0, 'Marie'), person(2, 'Léa'), person(3, 'Inès')] })
    expect(roomNews(prev, next, true).soon.map((s) => s.text)).toEqual(['Léa and Inès joined', 'Hugo left'])
    const meArrives = roomNews(view({ me: null, participants: [] }), view(), false)
    expect(meArrives.soon).toEqual([])
  })

  it('announces a Vote starting and the Reveal coming', () => {
    const open = { question: 'Ready?', revealed: false, myValue: null, progress: null, results: null }
    expect(roomNews(view(), view({ vote: open }), false).now).toEqual(['Vote started: Ready? Choose 0 to 5'])
    const revealed = { ...open, revealed: true, results: { hands: [], average: null, distribution: [0, 0, 0, 0, 0, 0] } }
    expect(roomNews(view({ vote: open }), view({ vote: revealed }), false).now).toEqual([
      'Revealing the hands',
    ])
  })

  it('tells the Facilitator how many have answered, without values', () => {
    const p = (answered: number, waiting: number) => ({
      answered: Array.from({ length: answered }, (_, i) => person(i, `P${i}`)),
      waitingOn: Array.from({ length: waiting }, (_, i) => person(10 + i, `W${i}`)),
    })
    const vote = (progress: ReturnType<typeof p>) =>
      ({ question: '', revealed: false, myValue: null, progress, results: null }) as RoomView['vote']
    const news = roomNews(view({ vote: vote(p(1, 3)) }), view({ vote: vote(p(2, 2)) }), true)
    expect(news.soon).toEqual([{ key: 'answered', text: '2 of 4 have answered' }])
    expect(roomNews(view({ vote: vote(p(1, 3)) }), view({ vote: vote(p(2, 2)) }), false).soon).toEqual([])
  })

  it('announces a round starting and the Entry total to the Facilitator', () => {
    const round = (entries: number) => ({
      prompt: '',
      revealed: false,
      myEntries: [],
      progress: [{ ...person(1, 'Hugo'), entries }],
      cloud: null,
    })
    expect(roomNews(view(), view({ round: round(0) }), true).now).toEqual(['Round started. Add up to 3 words'])
    expect(roomNews(view({ round: round(1) }), view({ round: round(3) }), true).soon).toEqual([
      { key: 'entries', text: '3 Entries so far' },
    ])
  })
})

describe('summaries', () => {
  it('summarises a Vote', () => {
    const hands = [4, 4, 5, 2].map((value, key) => ({ key, name: `P${key}`, value }))
    expect(voteSummary({ hands, average: 3.75, distribution: [0, 0, 1, 0, 2, 1] })).toBe(
      'Results: average 3.8 out of 5 from 4 votes. Most common: 4, 2 people',
    )
    const fists = [0, 0, 3].map((value, key) => ({ key, name: `P${key}`, value }))
    expect(voteSummary({ hands: fists, average: 1, distribution: [2, 0, 0, 1, 0, 0] })).toBe(
      'Results: average 1.0 out of 5 from 3 votes. Most common: 0 (fist), 2 people',
    )
    expect(voteSummary({ hands: [], average: null, distribution: [0, 0, 0, 0, 0, 0] })).toBe(
      'Results: nobody answered this Vote',
    )
  })

  it('summarises a Cloud', () => {
    expect(
      cloudSummary([
        { text: 'Trust', count: 3 },
        { text: 'Fun', count: 2 },
        { text: 'Calm', count: 1 },
        { text: 'Chaos', count: 1 },
      ]),
    ).toBe('Results: 4 different Entries. Top: Trust (3), Fun (2) and Calm (1)')
  })
})
