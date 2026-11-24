<script lang="ts">
  import type { Message, VoteView } from './room/room'

  const { vote, isFacilitator, send }: { vote: VoteView | null; isFacilitator: boolean; send: (m: Message) => void } =
    $props()

  let question = $state('')

  function startVote(event: SubmitEvent) {
    event.preventDefault()
    send({ type: 'startVote', question })
    question = ''
  }

  const names = (people: { name: string }[]) => people.map((p) => p.name).join(', ') || 'nobody'
</script>

<section class="fist">
  {#if vote}
    <h2>{vote.question || 'Fist of Five'}</h2>

    {#if !vote.revealed}
      <p>How confident are you? Pick 1 (not at all) to 5 (fully). You can change it until the Reveal.</p>
      <div class="values" role="group" aria-label="Your value">
        {#each [1, 2, 3, 4, 5] as value (value)}
          <button
            type="button"
            class:picked={vote.myValue === value}
            aria-pressed={vote.myValue === value}
            onclick={() => send({ type: 'answer', value })}>{value}</button
          >
        {/each}
      </div>

      {#if vote.progress}
        <p>Answered ({vote.progress.answered.length}): {names(vote.progress.answered)}</p>
        <p>Waiting on ({vote.progress.waitingOn.length}): {names(vote.progress.waitingOn)}</p>
        <button type="button" onclick={() => send({ type: 'reveal' })}>Reveal</button>
      {:else}
        <p class="status">Values stay hidden until the Facilitator reveals them.</p>
      {/if}
    {:else if vote.results}
      {@const { hands, average, distribution } = vote.results}
      {#if hands.length === 0}
        <p>Nobody answered this Vote.</p>
      {:else}
        <p class="average">Average: <strong>{average?.toFixed(1)}</strong></p>
        <ul class="hands">
          {#each hands as hand (hand.id)}
            <li>{hand.name}: <strong>{hand.value}</strong></li>
          {/each}
        </ul>
      {/if}
      <table class="distribution">
        <tbody>
          {#each distribution as count, i (i)}
            <tr><th>{i + 1}</th><td>{count}</td></tr>
          {/each}
        </tbody>
      </table>
    {/if}
  {:else if !isFacilitator}
    <p class="status">Waiting for the Facilitator to start a Vote…</p>
  {/if}

  {#if isFacilitator && (!vote || vote.revealed)}
    <form onsubmit={startVote}>
      <label>
        Question (optional)
        <input bind:value={question} maxlength="200" placeholder="e.g. How confident are we in this plan?" />
      </label>
      <button type="submit">{vote ? 'New Vote' : 'Start a Vote'}</button>
    </form>
  {/if}
</section>

<style>
  .values {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .values button {
    min-width: 3rem;
    background: #fff;
    color: inherit;
    border: 1px solid #c8c8c4;
  }
  .values button.picked {
    background: #2f5d50;
    color: #fff;
    border-color: #2f5d50;
  }
  .distribution th {
    text-align: right;
    padding-right: 0.75rem;
  }
</style>
