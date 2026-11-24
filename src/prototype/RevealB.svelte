<!-- PROTOTYPE B — no circle: five columns, one per value. People drop into the column they raised. -->
<script lang="ts">
  import type { VoteResults } from '../room/room'
  import OutlineHand from './OutlineHand.svelte'

  const { results }: { results: VoteResults } = $props()
  const COLORS = ['#e4572e', '#f3a712', '#e9c46a', '#76b041', '#2a9d8f']
  const columns = $derived([1, 2, 3, 4, 5].map((v) => results.hands.filter((h) => h.value === v)))
  const avgPos = $derived(results.average === null ? 0 : ((results.average - 1) / 4) * 80 + 10)
</script>

<div class="wrap">
  <header>
    <div class="track">
      <span class="marker" style:left="{avgPos}%">
        <b>{results.average?.toFixed(1)}</b>
        <small>average</small>
      </span>
    </div>
  </header>

  <div class="cols">
    {#each columns as people, v (v)}
      <section style:--c={COLORS[v]} class:empty={people.length === 0}>
        <div class="head">
          <div class="art"><OutlineHand value={v + 1} /></div>
          <span class="count">{people.length}</span>
        </div>
        <ul>
          {#each people as p, i (p.key)}
            <li style:--delay="{300 + i * 90 + v * 40}ms">{p.name}</li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</div>

<style>
  .wrap {
    max-width: 60rem;
    margin: 0 auto;
  }
  header {
    padding: 1rem 0 4.5rem;
  }
  .track {
    position: relative;
    height: 6px;
    margin: 0 0;
    border-radius: 3px;
    background: linear-gradient(90deg, #e4572e, #f3a712, #e9c46a, #76b041, #2a9d8f);
  }
  .marker {
    position: absolute;
    top: -0.4rem;
    translate: -50% 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.1;
    animation: slide 1.2s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .marker::before {
    content: '';
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    border: 4px solid #1d1d1f;
    margin-bottom: 0.3rem;
  }
  .marker b {
    font-size: 1.6rem;
  }
  .marker small {
    color: #5c5c58;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.75rem;
    align-items: start;
  }
  section {
    border-radius: 14px;
    background: color-mix(in srgb, var(--c) 12%, #fff);
    padding: 0.75rem 0.5rem;
    --ink: color-mix(in srgb, var(--c) 70%, #222);
    --fill: #fff;
  }
  section.empty {
    opacity: 0.45;
  }
  .head {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .art {
    width: min(5rem, 70%);
    aspect-ratio: 1;
  }
  .count {
    font-size: 2rem;
    font-weight: 800;
    color: var(--ink);
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  li {
    padding: 0.3rem 0.5rem;
    border-radius: 8px;
    background: #fff;
    border-left: 4px solid var(--c);
    font-size: 0.85rem;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    animation: drop 450ms cubic-bezier(0.34, 1.56, 0.64, 1) var(--delay) both;
  }
  @keyframes drop {
    from {
      opacity: 0;
      transform: translateY(-1.5rem);
    }
  }
  @keyframes slide {
    from {
      left: 10%;
    }
  }
</style>
