<script lang="ts">
  import Hand from './Hand.svelte'
  import { placeHands } from './lib/handCircle'
  import type { VoteResults } from './room/room'

  const { results }: { results: VoteResults } = $props()

  const layout = $derived(placeHands(results.hands.length))
  const most = $derived(Math.max(1, ...results.distribution))
  // Spread the entrance over at most ~0.8s, however many Hands there are.
  const stagger = $derived(Math.min(70, 800 / Math.max(1, results.hands.length)))
</script>

<div class="stage" style:--size={layout.size}>
  {#each results.hands as hand, i (hand.key)}
    {@const spot = layout.spots[i]}
    <div
      class="hand v{hand.value}"
      style:left="{spot.x}%"
      style:top="{spot.y}%"
      style:--delay="{i * stagger}ms"
      style:--float-delay="{-((i * 1.7) % 6)}s"
      style:--float-duration="{5 + (i % 3)}s"
    >
      <div class="float">
        <div class="art"><Hand value={hand.value} /></div>
        <span class="pill" title={hand.name}>{hand.name}</span>
      </div>
    </div>
  {/each}

  <div class="center">
    {#if results.average === null}
      <p class="none">Nobody answered this Vote.</p>
    {:else}
      <p class="average">
        <span class="number">{results.average.toFixed(1)}</span>
        <span class="label">average of {results.hands.length}</span>
      </p>
    {/if}
    <ol class="bars" aria-label="Distribution">
      {#each results.distribution as count, i (i)}
        <li class="v{i + 1}" aria-label="{i + 1}: {count}">
          <span class="count">{count}</span>
          <span class="bar" style:--fill={count / most}></span>
          <span class="value">{i + 1}</span>
        </li>
      {/each}
    </ol>
  </div>
</div>

<style>
  .stage {
    position: relative;
    width: min(100%, 78vh);
    aspect-ratio: 1;
    margin: 1rem auto;
    container-type: size;
  }

  /* One tint per value, low (warm) to high (the app's green). */
  .v1 { --c: #e4572e; }
  .v2 { --c: #f3a712; }
  .v3 { --c: #e9c46a; }
  .v4 { --c: #76b041; }
  .v5 { --c: #2a9d8f; }

  .hand {
    position: absolute;
    width: calc(var(--size) * 1cqw);
    height: calc(var(--size) * 1cqw);
    margin: 0;
    translate: -50% -50%;
    --hand-ink: color-mix(in srgb, var(--c) 70%, #222);
    --hand-fill: color-mix(in srgb, var(--c) 22%, #fff);
    animation: pop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) var(--delay) both;
  }

  .float {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    animation: float var(--float-duration) ease-in-out var(--float-delay) infinite;
  }

  .art {
    flex: 1;
    min-height: 0;
    aspect-ratio: 1;
  }

  .pill {
    max-width: 120%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0.1em 0.6em;
    border-radius: 999px;
    background: var(--c);
    color: #fff;
    font-size: clamp(0.6rem, calc(var(--size) * 0.12cqw), 0.95rem);
    font-weight: 700;
    line-height: 1.4;
  }

  .center {
    position: absolute;
    inset: 30%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3cqw;
    text-align: center;
    animation: fade 500ms ease-out 200ms both;
  }

  .average {
    margin: 0;
    display: flex;
    flex-direction: column;
    line-height: 1;
  }
  .number {
    font-size: 11cqw;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .label {
    margin-top: 0.8cqw;
    font-size: max(0.7rem, 2.3cqw);
    color: #5c5c58;
  }
  .none {
    margin: 0;
    font-size: max(0.8rem, 2.6cqw);
  }

  .bars {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: flex-end;
    gap: 1.6cqw;
    height: 14cqw;
  }
  .bars li {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
    width: 4.4cqw;
    font-size: max(0.65rem, 2.1cqw);
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
  }
  .bar {
    width: 100%;
    height: calc(var(--fill) * 100% - 2 * 1.2em);
    min-height: 2px;
    border-radius: 3px 3px 0 0;
    background: var(--c);
    transform-origin: bottom;
    animation: grow 600ms cubic-bezier(0.22, 1, 0.36, 1) 400ms both;
  }
  .count {
    color: #5c5c58;
  }
  .value {
    font-weight: 700;
  }

  @keyframes pop {
    from {
      opacity: 0;
      scale: 0;
      rotate: -25deg;
    }
  }
  @keyframes float {
    50% {
      transform: translateY(-1cqw) rotate(-3deg);
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @keyframes grow {
    from {
      transform: scaleY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hand,
    .center {
      animation: fade 200ms linear both;
    }
    .float,
    .bar {
      animation: none;
    }
  }
</style>
