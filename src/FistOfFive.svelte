<script lang="ts">
  import Countdown from './Countdown.svelte'
  import Hand from './Hand.svelte'
  import HandsReveal from './HandsReveal.svelte'
  import Presence from './Presence.svelte'
  import { celebrate, tap } from './lib/juice'
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
  // Play the countdown only when we watched the Vote go from open to revealed (late joiners skip it).
  let wasOpen: boolean | undefined
  $effect(() => {
    const revealed = vote?.revealed
    if (revealed && wasOpen) counting = true
    wasOpen = vote ? !revealed : undefined
  })

  function startVote(event: SubmitEvent) {
    event.preventDefault()
    tap()
    send({ type: 'startVote', question })
    question = ''
  }

  function pick(value: number) {
    tap(value === 5 ? 20 : 10)
    send({ type: 'answer', value })
  }

  function revealed() {
    counting = false
    // Confetti only when the team is aligned; a low score deserves a conversation, not a party.
    if ((vote?.results?.average ?? 0) >= 4) celebrate()
  }

  const answeredKeys = $derived(new Set(vote?.progress?.answered.map((p) => p.key)))
  const people = $derived(participants.map((p) => ({ ...p, done: answeredKeys.has(p.key) })))
  const inCount = $derived(vote?.progress?.answered.length ?? 0)
  const expected = $derived(inCount + (vote?.progress?.waitingOn.length ?? 0))
</script>

<section class="fist">
  <h1>{vote?.question || 'Fist of Five'}</h1>

  {#if vote && !vote.revealed}
    <p class="label lead">
      {vote.myValue ? 'Locked in. You can change it until the Reveal' : 'How confident are you? Your pick stays hidden until the Reveal'}
    </p>

    <div class="values" role="group" aria-label="Your value" class:has-pick={vote.myValue}>
      {#each HAND_VALUES as value (value)}
        <button
          type="button"
          class="value"
          class:picked={vote.myValue === value}
          style:--c="var(--value-{value})"
          style:--ink="var(--ink-{value})"
          aria-pressed={vote.myValue === value}
          onclick={() => pick(value)}
        >
          <span class="art"><Hand {value} /></span>
          <span class="num">{value}</span>
          <span class="hint">{HINTS[value - 1]}</span>
        </button>
      {/each}
    </div>
  {:else if vote?.revealed}
    {#if counting}
      <Countdown onDone={revealed} />
    {:else if vote.results}
      <HandsReveal results={vote.results} />
    {/if}
  {:else if !isFacilitator}
    <p class="status"><span class="dots"><i></i><i></i><i></i></span> Waiting for the Facilitator to start a Vote</p>
  {/if}

  {#if isFacilitator && vote && !vote.revealed}
    <div class="control">
      {#key inCount}<span class="tally"><b>{inCount}</b> / {expected} in</span>{/key}
      <button type="button" class="reveal" onclick={() => (tap(), send({ type: 'reveal' }))}>Reveal</button>
    </div>
  {/if}

  {#if isFacilitator && (!vote || (vote.revealed && !counting))}
    <form class="composer" onsubmit={startVote}>
      <input
        bind:value={question}
        maxlength={MAX_QUESTION_LENGTH}
        placeholder={vote ? 'Next question (optional)' : 'What should people rate? (optional)'}
        aria-label="Question"
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
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
  }
  .value {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    height: auto;
    padding: 20px 8px 16px;
    border-radius: 20px;
    background: var(--surface);
    box-shadow: inset 0 0 0 1px var(--line);
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
  .has-pick .value:not(.picked) {
    opacity: 0.5;
  }
  .value.picked {
    background: var(--c);
    box-shadow: 0 12px 28px -12px var(--ink);
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
    display: flex;
    gap: 8px;
  }
  .composer input {
    flex: 1;
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
