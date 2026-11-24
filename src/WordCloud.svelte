<script lang="ts">
  import { fly, scale } from 'svelte/transition'
  import { backOut } from 'svelte/easing'
  import CloudReveal from './CloudReveal.svelte'
  import Countdown from './Countdown.svelte'
  import Presence from './Presence.svelte'
  import { tap } from './lib/juice'
  import {
    MAX_ENTRY_LENGTH,
    MAX_ENTRY_WORDS,
    MAX_PROMPT_LENGTH,
    cleanEntry,
    type Message,
    type ParticipantView,
    type RoundView,
  } from './room/room'

  const {
    round,
    isFacilitator,
    participants,
    meKey,
    send,
  }: {
    round: RoundView | null
    isFacilitator: boolean
    participants: ParticipantView[]
    meKey?: number
    send: (m: Message) => void
  } = $props()

  let prompt = $state('')
  let entry = $state('')
  const valid = $derived(cleanEntry(entry) !== null)

  let counting = $state(false)
  // Play the countdown only when we watched the round go from open to revealed (late joiners skip it).
  let wasOpen: boolean | undefined
  $effect(() => {
    const revealed = round?.revealed
    if (revealed && wasOpen) counting = true
    wasOpen = round ? !revealed : undefined
  })

  function startRound(event: SubmitEvent) {
    event.preventDefault()
    tap()
    send({ type: 'startRound', prompt })
    prompt = ''
  }

  function addEntry(event: SubmitEvent) {
    event.preventDefault()
    if (!valid) return
    tap()
    send({ type: 'addEntry', text: entry })
    entry = ''
  }


  // A sticky note's tilt, stable per Entry.
  const tilt = (id: number) => ((id * 37) % 7) - 3

  const counts = $derived(new Map(round?.progress?.map((p) => [p.key, p.entries])))
  const people = $derived(
    participants.map((p) => {
      const n = counts.get(p.key) ?? 0
      return { ...p, done: n > 0, badge: n || undefined }
    }),
  )
  const total = $derived([...counts.values()].reduce((s, n) => s + n, 0))
</script>

<section class="cloud">
  <h1>{round?.prompt || 'Word Cloud'}</h1>

  {#if round && !round.revealed}
    <form class="composer" onsubmit={addEntry}>
      <input
        bind:value={entry}
        maxlength={MAX_ENTRY_LENGTH}
        placeholder="Up to {MAX_ENTRY_WORDS} words"
        aria-label="Your Entry"
        autocomplete="off"
      />
      <button type="submit" disabled={!valid}>Add</button>
    </form>

    {#if round.myEntries.length}
      <ul class="notes" aria-label="Your Entries">
        {#each round.myEntries as mine, i (mine.id)}
          <li
            style:--tilt="{tilt(mine.id)}deg"
            style:--c="var(--value-{(i % 5) + 1})"
            in:fly={{ y: 24, duration: 450, easing: backOut }}
            out:scale={{ start: 0.6, duration: 180 }}
          >
            {mine.text}
            <button
              type="button"
              class="remove"
              aria-label="Delete {mine.text}"
              onclick={() => send({ type: 'removeEntry', id: mine.id })}
            >
              <svg viewBox="0 0 16 16"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" /></svg>
            </button>
          </li>
        {/each}
      </ul>
      <p class="label">Only you can see these until the Reveal</p>
    {/if}
  {:else if round?.revealed}
    {#if counting}
      <Countdown onDone={() => (counting = false)} />
    {:else if round.cloud?.length}
      <CloudReveal cloud={round.cloud} />
    {:else}
      <p class="status">Nobody added an Entry this round</p>
    {/if}
  {:else if !isFacilitator}
    <p class="status"><span class="dots"><i></i><i></i><i></i></span> Waiting for the Facilitator to start a round</p>
  {/if}

  {#if isFacilitator && round && !round.revealed}
    <div class="control">
      {#key total}<span class="tally"><b>{total}</b> {total === 1 ? 'Entry' : 'Entries'} so far</span>{/key}
      <button type="button" class="reveal" onclick={() => (tap(), send({ type: 'reveal' }))}>Reveal</button>
    </div>
  {/if}

  {#if isFacilitator && (!round || (round.revealed && !counting))}
    <form class="composer" onsubmit={startRound}>
      <input
        bind:value={prompt}
        maxlength={MAX_PROMPT_LENGTH}
        placeholder={round ? 'Next prompt (optional)' : 'What should people answer? (optional)'}
        aria-label="Prompt"
      />
      <button type="submit">{round ? 'New round' : 'Start the round'}</button>
    </form>
  {/if}

  <div class="room">
    <p class="label">In the room · {participants.length}</p>
    <Presence people={isFacilitator && round && !round.revealed ? people : participants} {meKey} />
  </div>
</section>

<style>
  .cloud {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .composer {
    display: flex;
    gap: 8px;
  }
  .composer input {
    flex: 1;
    min-width: 0;
    height: 56px;
    font-size: 18px;
  }
  .composer button {
    height: 56px;
  }

  .notes {
    list-style: none;
    margin: 0;
    padding: 8px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .notes li {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 48px;
    padding: 0 4px 0 16px;
    border-radius: 6px;
    background: var(--c);
    box-shadow: 0 6px 14px -8px rgb(31 27 22 / 0.35);
    font-size: 17px;
    font-weight: 500;
    rotate: var(--tilt);
    transition: rotate var(--pop) var(--spring);
  }
  .notes li:hover {
    rotate: 0deg;
  }
  .remove {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--text-2);
  }
  .remove:hover {
    background: rgb(31 27 22 / 0.08);
  }
  .remove svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.75;
    stroke-linecap: round;
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

  .room {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
  }
</style>
