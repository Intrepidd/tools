// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte'
import { tick } from 'svelte'
import { axeViolations, stubMatchMedia } from './test/a11y'
import Announcer from './Announcer.svelte'
import Home from './Home.svelte'
import FistOfFive from './FistOfFive.svelte'
import WordCloud from './WordCloud.svelte'
import type { ParticipantView, RoundView, VoteView } from './room/room'

beforeEach(() => {
  cleanup()
  stubMatchMedia()
})

const people: ParticipantView[] = [
  { key: 0, name: 'Marie', isFacilitator: true },
  { key: 1, name: 'Hugo', isFacilitator: false },
  { key: 2, name: 'Léa', isFacilitator: false },
]

const openVote = (over: Partial<VoteView> = {}): VoteView => ({
  question: 'Ready to ship?',
  revealed: false,
  myValue: null,
  progress: null,
  results: null,
  ...over,
})

const openRound = (over: Partial<RoundView> = {}): RoundView => ({
  prompt: 'One word for this sprint',
  revealed: false,
  myEntries: [],
  progress: null,
  cloud: null,
  ...over,
})

describe('Announcer', () => {
  it('has one polite and one assertive region from the start', () => {
    render(Announcer)
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })
})

describe('Home', () => {
  it('has no axe violations and a labelled name field', async () => {
    const { container } = render(Home)
    expect(screen.getByLabelText('Your name')).toBeTruthy()
    expect(await axeViolations(container)).toEqual([])
  })

  it('explains a missing name instead of disabling the Activity buttons', async () => {
    localStorage.clear()
    render(Home)
    await fireEvent.click(screen.getByRole('button', { name: 'New Fist of Five' }))
    const input = screen.getByLabelText('Your name')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toMatch(/Enter your name/)
    expect(document.activeElement).toBe(input)
  })
})

describe('Fist of Five', () => {
  it('offers the 0–5 choice as a named radio group', async () => {
    const send = vi.fn()
    const { container } = render(FistOfFive, {
      vote: openVote({ myValue: 4 }),
      isFacilitator: false,
      participants: people,
      meKey: 1,
      send,
    })
    const group = screen.getByRole('group', { name: /Your value/ })
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(6)
    expect(radios[0].getAttribute('value')).toBe('0')
    expect((radios[4] as HTMLInputElement).checked).toBe(true)
    await fireEvent.click(radios[0])
    expect(send).toHaveBeenCalledWith({ type: 'answer', value: 0 })
    expect(await axeViolations(container)).toEqual([])
  })

  it('shows who answered in words for the Facilitator, without values', async () => {
    const { container } = render(FistOfFive, {
      vote: openVote({ progress: { answered: [people[1]], waitingOn: [people[2]] } }),
      isFacilitator: true,
      participants: people,
      meKey: 0,
      send: () => {},
    })
    const list = screen.getByRole('list', { name: 'People in the room, 3' })
    expect(within(list).getByText(/answered/).closest('li')?.textContent).toContain('Hugo')
    expect(screen.getByRole('button', { name: 'Reveal' })).toBeTruthy()
    expect(await axeViolations(container)).toEqual([])
  })

  it('gives the revealed Hands a heading, a summary and a full table', async () => {
    const hands = [
      { key: 1, name: 'Hugo', value: 4 },
      { key: 2, name: 'Léa', value: 0 },
    ]
    const { container } = render(FistOfFive, {
      vote: openVote({ revealed: true, results: { hands, average: 2, distribution: [1, 0, 0, 0, 1, 0] } }),
      isFacilitator: false,
      participants: people,
      meKey: 1,
      send: () => {},
    })
    await tick()
    expect(screen.getByRole('heading', { name: 'Results' })).toBeTruthy()
    expect(screen.getByText(/Average 2.0 out of 5 from 2 votes/)).toBeTruthy()
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(7) // header + one row per value 0–5, empty ones included
    expect(rows[1].textContent).toContain('Léa')
    expect(rows[5].textContent).toContain('Hugo')
    expect(container.querySelector('.stage')?.getAttribute('aria-hidden')).toBe('true')
    expect(await axeViolations(container)).toEqual([])
  })
})

describe('Word Cloud', () => {
  it('labels the Entry field, names each remove button and explains invalid input', async () => {
    const send = vi.fn()
    const { container } = render(WordCloud, {
      round: openRound({ myEntries: [{ id: 1, text: 'Trust' }, { id: 2, text: 'Fun' }] }),
      isFacilitator: false,
      participants: people,
      meKey: 1,
      send,
    })
    expect(screen.getByRole('button', { name: 'Remove Trust' })).toBeTruthy()
    const input = screen.getByLabelText('Your Entry')
    await fireEvent.input(input, { target: { value: 'one two three four' } })
    await fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(send).not.toHaveBeenCalled()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toContain('entry-error')
    expect(await axeViolations(container)).toEqual([])
  })

  it('moves focus to the next remove button after deleting an Entry', async () => {
    const send = vi.fn()
    render(WordCloud, {
      round: openRound({ myEntries: [{ id: 1, text: 'Trust' }, { id: 2, text: 'Fun' }] }),
      isFacilitator: false,
      participants: people,
      meKey: 1,
      send,
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Remove Trust' }))
    await tick()
    expect(send).toHaveBeenCalledWith({ type: 'removeEntry', id: 1 })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Fun' }))
  })

  it('gives the revealed Cloud a heading and a list of every Entry', async () => {
    const { container } = render(WordCloud, {
      round: openRound({ revealed: true, cloud: [{ text: 'Trust', count: 3 }, { text: 'Fun', count: 1 }] }),
      isFacilitator: true,
      participants: people,
      meKey: 0,
      send: () => {},
    })
    await tick()
    expect(screen.getByRole('heading', { name: 'Results' })).toBeTruthy()
    expect(screen.getByText('Trust, 3 times').tagName).toBe('LI')
    expect(screen.getByText('Fun, 1 time').tagName).toBe('LI')
    expect(await axeViolations(container)).toEqual([])
  })
})
