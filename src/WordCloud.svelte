<script lang="ts">
  import {
    MAX_ENTRY_LENGTH,
    MAX_ENTRY_WORDS,
    MAX_PROMPT_LENGTH,
    cleanEntry,
    type Message,
    type RoundView,
  } from './room/room'

  const { round, isFacilitator, send }: { round: RoundView | null; isFacilitator: boolean; send: (m: Message) => void } =
    $props()

  let prompt = $state('')
  let entry = $state('')
  const valid = $derived(cleanEntry(entry) !== null)

  function startRound(event: SubmitEvent) {
    event.preventDefault()
    send({ type: 'startRound', prompt })
    prompt = ''
  }

  function addEntry(event: SubmitEvent) {
    event.preventDefault()
    if (!valid) return
    send({ type: 'addEntry', text: entry })
    entry = ''
  }

  // Plain Reveal: font size grows with the count, from 1rem to 3rem.
  function size(count: number, max: number): string {
    return `${1 + (max > 1 ? (2 * (count - 1)) / (max - 1) : 0)}rem`
  }
</script>

<section class="cloud">
  {#if round}
    <h2>{round.prompt || 'Word Cloud'}</h2>

    {#if !round.revealed}
      <form onsubmit={addEntry}>
        <label>
          Your Entry (up to {MAX_ENTRY_WORDS} words)
          <div class="link">
            <input bind:value={entry} maxlength={MAX_ENTRY_LENGTH} placeholder="e.g. Trust" />
            <button type="submit" disabled={!valid}>Add</button>
          </div>
        </label>
      </form>

      {#if round.myEntries.length}
        <ul class="mine">
          {#each round.myEntries as mine (mine.id)}
            <li>
              {mine.text}
              <button
                type="button"
                class="remove"
                aria-label="Delete {mine.text}"
                onclick={() => send({ type: 'removeEntry', id: mine.id })}>×</button
              >
            </li>
          {/each}
        </ul>
      {/if}

      {#if round.progress}
        <ul class="participants">
          {#each round.progress as person (person.key)}
            <li>{person.name}<span class="tag">{person.entries} {person.entries === 1 ? 'Entry' : 'Entries'}</span></li>
          {/each}
        </ul>
        <button type="button" onclick={() => send({ type: 'reveal' })}>Reveal</button>
      {:else}
        <p class="status">Entries stay hidden until the Facilitator reveals them.</p>
      {/if}
    {:else if round.cloud}
      {#if round.cloud.length}
        <ul class="revealed">
          {#each round.cloud as item (item.text)}
            <li style:font-size={size(item.count, round.cloud[0].count)}>
              {item.text}<span class="tag">{item.count}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="status">Nobody submitted an Entry.</p>
      {/if}
    {/if}
  {:else if !isFacilitator}
    <p class="status">Waiting for the Facilitator to start a round…</p>
  {/if}

  {#if isFacilitator && (!round || round.revealed)}
    <form onsubmit={startRound}>
      <label>
        Prompt (optional)
        <input bind:value={prompt} maxlength={MAX_PROMPT_LENGTH} placeholder="e.g. One word for this sprint?" />
      </label>
      <button type="submit">{round ? 'New round' : 'Start a round'}</button>
    </form>
  {/if}
</section>

<style>
  .mine {
    list-style: none;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .mine li {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.25rem 0.25rem 0.75rem;
    border: 1px solid #c8c8c4;
    border-radius: 999px;
    background: #fff;
  }
  .remove {
    padding: 0 0.5rem;
    background: transparent;
    color: #5c5c58;
  }
  .revealed {
    list-style: none;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem 1.25rem;
  }
  .revealed li {
    line-height: 1.2;
    color: #2f5d50;
    overflow-wrap: anywhere;
  }
</style>
