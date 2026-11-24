<script lang="ts">
  import { fly, scale } from 'svelte/transition'
  import { backOut } from 'svelte/easing'
  import CloudReveal from './CloudReveal.svelte'
  import Countdown from './Countdown.svelte'
  import Presence from './Presence.svelte'
  import { tap } from './lib/juice'
  import { announce } from './lib/announcer.svelte'
  import { cloudSummary } from './lib/roomNews'
  import { tick } from 'svelte'
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
  let entryError = $state('')
  let entryInput: HTMLInputElement | undefined = $state()

  let counting = $state(false)
  let focusResults = false
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  // Play the countdown only when we watched the round go from open to revealed (late joiners skip it).
  let wasOpen: boolean | undefined
  $effect(() => {
    const revealed = round?.revealed
    if (revealed && wasOpen) {
      if (reducedMotion) revealed_()
      else counting = true
    }
    wasOpen = round ? !revealed : undefined
  })

  async function focusOn(selector: string) {
    await tick()
    document.querySelector<HTMLElement>(selector)?.focus()
  }

  function reveal() {
    tap()
    focusResults = true
    send({ type: 'reveal' })
  }

  function revealed_() {
    counting = false
    if (round?.cloud) announce(cloudSummary(round.cloud))
    if (focusResults) {
      focusResults = false
      focusOn('#results-heading')
    }
  }

  function startRound(event: SubmitEvent) {
    event.preventDefault()
    tap()
    send({ type: 'startRound', prompt })
    prompt = ''
    focusOn('main h1')
  }

  function addEntry(event: SubmitEvent) {
    event.preventDefault()
    const text = cleanEntry(entry)
    if (text === null) {
      entryError = `Use 1 to ${MAX_ENTRY_WORDS} words and at most ${MAX_ENTRY_LENGTH} characters`
      entryInput?.focus()
      return
    }
    entryError = ''
    tap()
    send({ type: 'addEntry', text })
    entry = ''
    const n = (round?.myEntries.length ?? 0) + 1
    announce(`Added ${text}. You have ${n} ${n === 1 ? 'Entry' : 'Entries'}`)
  }

  /** Delete one of my Entries, then focus the next delete button, else the previous, else the input. */
  async function remove(index: number) {
    const mine = round?.myEntries ?? []
    const gone = mine[index]
    const next = mine[index + 1] ?? mine[index - 1]
    send({ type: 'removeEntry', id: gone.id })
    announce(`Removed ${gone.text}`)
    await tick()
    if (next) document.querySelector<HTMLElement>(`[data-entry="${next.id}"]`)?.focus()
    else entryInput?.focus()
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
  <h1 tabindex="-1">{round?.prompt || 'Word Cloud'}</h1>

  {#if round && !round.revealed}
    <form class="composer" onsubmit={addEntry} novalidate>
      <label for="entry" class="label">Your Entry</label>
      <input
        id="entry"
        bind:this={entryInput}
        bind:value={entry}
        autocomplete="off"
        aria-describedby="entry-hint{entryError ? ' entry-error' : ''}"
        aria-invalid={entryError ? 'true' : undefined}
      />
      <button type="submit">Add</button>
      <p id="entry-hint" class="label hint">Up to {MAX_ENTRY_WORDS} words, {MAX_ENTRY_LENGTH} characters. Add as many as you like</p>
      {#if entryError}<p id="entry-error" class="error">{entryError}</p>{/if}
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
              aria-label="Remove {mine.text}"
              data-entry={mine.id}
              onclick={() => remove(i)}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" /></svg>
            </button>
          </li>
        {/each}
      </ul>
      <p class="label">Only you can see these until the Reveal</p>
    {/if}
  {:else if round?.revealed}
    {#if counting}
      <Countdown onDone={revealed_} />
    {:else if round.cloud?.length}
      <CloudReveal cloud={round.cloud} />
    {:else}
      <p class="status">Nobody added an Entry this round</p>
    {/if}
  {:else if !isFacilitator}
    <p class="status"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span> Waiting for the Facilitator to start a round</p>
  {/if}

  {#if isFacilitator && round && !round.revealed}
    <div class="control">
      {#key total}<span class="tally"><b>{total}</b> {total === 1 ? 'Entry' : 'Entries'} so far</span>{/key}
      <button type="button" class="reveal" onclick={reveal}>Reveal</button>
    </div>
  {/if}

  {#if isFacilitator && (!round || (round.revealed && !counting))}
    <form class="composer" onsubmit={startRound}>
      <label for="round-prompt" class="label">{round ? 'Next prompt' : 'Prompt'} (optional)</label>
      <input
        id="round-prompt"
        bind:value={prompt}
        maxlength={MAX_PROMPT_LENGTH}
        placeholder="What should people answer?"
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
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }
  .composer label,
  .composer p {
    grid-column: 1 / -1;
  }
  .composer input {
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
    width: 40px;
    height: 40px;
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
