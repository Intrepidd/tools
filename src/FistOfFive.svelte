<script lang="ts">
  import Countdown from './Countdown.svelte'
  import Hand from './Hand.svelte'
  import HandsReveal from './HandsReveal.svelte'
  import Presence from './Presence.svelte'
  import { celebrate, tap } from './lib/juice'
  import { announce, announceSoon } from './lib/announcer.svelte'
  import { voteSummary } from './lib/roomNews'
  import { tick } from 'svelte'
  import { HAND_VALUES, MAX_QUESTION_LENGTH, type Message, type ParticipantView, type VoteView } from './room/room'

  const {
    vote,
    isFacilitator,
    participants,
    meKey,
    send,
  }: {
    vote: VoteView | null
    isFacilitator: boolean
    participants: ParticipantView[]
    meKey?: number
    send: (m: Message) => void
  } = $props()

  const HINTS = ['Not at all', 'Worried', 'Unsure', 'Confident', 'All in']

  let question = $state('')
  let counting = $state(false)
  // Set when this person pressed Reveal: they land on the results heading afterwards.
  let focusResults = false
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  // Play the countdown only when we watched the Vote go from open to revealed (late joiners skip it).
  let wasOpen: boolean | undefined
  $effect(() => {
    const revealed = vote?.revealed
    if (revealed && wasOpen) {
      if (reducedMotion) revealed_()
      else counting = true
    }
    wasOpen = vote ? !revealed : undefined
  })

  async function focusHeading(selector: string) {
    await tick()
    document.querySelector<HTMLElement>(selector)?.focus()
  }

  function startVote(event: SubmitEvent) {
    event.preventDefault()
    tap()
    send({ type: 'startVote', question })
    question = ''
    // The form goes away with the click, so focus lands on the Vote's heading.
    focusHeading('main h1')
  }

  function pick(value: number) {
    tap(value === 5 ? 20 : 10)
    send({ type: 'answer', value })
    // Arrowing through the radios picks each value on the way; only the last one is spoken.
    announceSoon(`Your pick: ${value}, hidden until the Reveal`, 'my-pick')
  }

  function reveal() {
    tap()
    focusResults = true
    send({ type: 'reveal' })
  }

  function revealed_() {
    counting = false
    if (vote?.results) announce(voteSummary(vote.results))
    if (focusResults) {
      focusResults = false
      focusHeading('#results-heading')
    }
    // Confetti only when the team is aligned; a low score deserves a conversation, not a party.
    if ((vote?.results?.average ?? 0) >= 4) celebrate()
  }

  const answeredKeys = $derived(new Set(vote?.progress?.answered.map((p) => p.key)))
  const people = $derived(participants.map((p) => ({ ...p, done: answeredKeys.has(p.key) })))
  const inCount = $derived(vote?.progress?.answered.length ?? 0)
  const expected = $derived(inCount + (vote?.progress?.waitingOn.length ?? 0))
</script>

<section class="fist">
  <h1 tabindex="-1">{vote?.question || 'Fist of Five'}</h1>

  {#if vote && !vote.revealed}
    <p class="label lead">
      {vote.myValue ? 'Locked in. You can change it until the Reveal' : 'How confident are you? Your pick stays hidden until the Reveal'}
    </p>

    <fieldset class="values" class:has-pick={vote.myValue}>
      <legend class="sr-only">Your value, from 1 (not at all) to 5 (all in)</legend>
      {#each HAND_VALUES as value (value)}
        <label class="value" class:picked={vote.myValue === value} style:--c="var(--value-{value})" style:--ink="var(--ink-{value})">
          <input
            type="radio"
            name="fist-value"
            class="sr-only"
            {value}
            checked={vote.myValue === value}
            onchange={() => pick(value)}
          />
          <span class="art" aria-hidden="true"><Hand {value} /></span>
          <span class="num">{value}</span>
          <span class="hint">{HINTS[value - 1]}</span>
          <svg class="tick" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8.5l2.5 2.5L12 5.5" /></svg>
        </label>
      {/each}
    </fieldset>
  {:else if vote?.revealed}
    {#if counting}
      <Countdown onDone={revealed_} />
    {:else if vote.results}
      <HandsReveal results={vote.results} />
    {/if}
  {:else if !isFacilitator}
    <p class="status"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span> Waiting for the Facilitator to start a Vote</p>
  {/if}

  {#if isFacilitator && vote && !vote.revealed}
    <div class="control">
      {#key inCount}<span class="tally"><b>{inCount}</b> of {expected} have answered</span>{/key}
      <button type="button" class="reveal" onclick={reveal}>Reveal</button>
    </div>
  {/if}

  {#if isFacilitator && (!vote || (vote.revealed && !counting))}
    <form class="composer" onsubmit={startVote}>
      <label for="vote-question" class="label">{vote ? 'Next question' : 'Question'} (optional)</label>
      <input
        id="vote-question"
        bind:value={question}
        maxlength={MAX_QUESTION_LENGTH}
        placeholder="What should people rate?"
      />
      <button type="submit">{vote ? 'New Vote' : 'Start the Vote'}</button>
    </form>
  {/if}

  <div class="room">
    <p class="label">In the room · {participants.length}</p>
    <Presence people={isFacilitator && vote && !vote.revealed ? people : participants} {meKey} />
  </div>
</section>

<style>
  .fist {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .lead {
    margin-top: -12px;
    font-size: 17px;
  }

  .values {
    margin: 0;
    padding: 0;
    border: 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
  }
  .value {
    position: relative;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    height: auto;
    padding: 20px 8px 16px;
    border-radius: 20px;
    background: var(--surface);
    box-shadow: inset 0 0 0 1px var(--edge);
    color: var(--text);
    --hand-fill: var(--surface);
    --hand-ink: var(--muted);
    transition:
      transform var(--pop) var(--spring),
      background-color var(--ui) var(--ease),
      opacity var(--ui) var(--ease),
      box-shadow var(--ui) var(--ease);
  }
  .value:hover {
    --hand-fill: color-mix(in srgb, var(--c) 50%, var(--surface));
    --hand-ink: var(--ink);
  }
  /* Fade only the drawing: the number and hint must keep 4.5:1. */
  .has-pick .value:not(.picked) .art {
    opacity: 0.45;
  }
  .value:has(input:focus-visible) {
    outline: 3px solid var(--text);
    outline-offset: 2px;
  }
  .value:active {
    transform: scale(0.96);
    transition-duration: 80ms;
  }
  .tick {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 24px;
    height: 24px;
    padding: 3px;
    border-radius: 50%;
    background: var(--text);
    fill: none;
    stroke: var(--surface);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0;
    scale: 0.4;
    transition: opacity var(--ui) var(--ease), scale var(--pop) var(--spring);
  }
  .value.picked .tick {
    opacity: 1;
    scale: 1;
  }
  .value.picked {
    background: var(--c);
    box-shadow: inset 0 0 0 3px var(--text), 0 12px 28px -12px var(--ink);
    transform: translateY(-6px) scale(1.04);
    --hand-fill: var(--surface);
    --hand-ink: var(--ink);
  }
  .value.picked .art {
    animation: boop 420ms var(--spring);
  }
  .art {
    width: min(88px, 100%);
    aspect-ratio: 1;
  }
  .num {
    font-size: 28px;
    font-weight: 600;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .hint {
    font-size: 13px;
    color: var(--text-2);
  }
  @keyframes boop {
    40% {
      transform: rotate(-10deg) scale(1.12);
    }
  }

  .control {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 12px 12px 24px;
    border-radius: 20px;
    background: var(--raised);
  }
  .tally {
    font-size: 17px;
    color: var(--text-2);
    font-variant-numeric: tabular-nums;
  }
  .tally b {
    display: inline-block;
    color: var(--text);
    font-weight: 600;
    animation: bump 400ms var(--spring);
  }
  .reveal {
    padding: 0 32px;
  }
  @keyframes bump {
    from {
      transform: scale(1.5);
    }
  }

  .composer {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }
  .composer label {
    grid-column: 1 / -1;
  }
  .composer input {
    min-width: 0;
  }

  .room {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
  }

  @media (max-width: 560px) {
    .values {
      gap: 6px;
    }
    .value {
      padding: 12px 4px;
      border-radius: 14px;
    }
    .hint {
      display: none;
    }
  }
</style>
