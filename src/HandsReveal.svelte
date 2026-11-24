<script lang="ts">
  import Hand from './Hand.svelte'
  import { placeHands } from './lib/handCircle'
  import type { VoteResults } from './room/room'
  import { Tween } from 'svelte/motion'
  import { cubicOut } from 'svelte/easing'

  const { results }: { results: VoteResults } = $props()

  const layout = $derived(placeHands(results.hands.length))
  const most = $derived(Math.max(1, ...results.distribution))
  // Spread the entrance over at most ~1.2s, however many Hands there are.
  const stagger = $derived(Math.min(80, 1200 / Math.max(1, results.hands.length)))
  // Hands land from the lowest value to the highest, so the picture builds up.
  const order = $derived(
    new Map([...results.hands].sort((a, b) => a.value - b.value).map((h, rank) => [h.key, rank])),
  )
  // The center counts up once the last Hand has landed.
  const after = $derived(results.hands.length * stagger + 300)
  const average = new Tween(0, { duration: 900, easing: cubicOut })
  $effect(() => {
    const target = results.average ?? 0
    const timer = setTimeout(() => average.set(target), after)
    return () => clearTimeout(timer)
  })
</script>

<div class="stage" style:--size={layout.size}>
  {#each results.hands as hand, i (hand.key)}
    {@const spot = layout.spots[i]}
    <div
      class="hand v{hand.value}"
      style:left="{spot.x}%"
      style:top="{spot.y}%"
      style:--delay="{(order.get(hand.key) ?? i) * stagger}ms"
      style:--float-delay="{-((i * 1.7) % 6)}s"
      style:--float-duration="{5 + (i % 3)}s"
    >
      <div class="float">
        <div class="art"><Hand value={hand.value} /></div>
        <span class="pill" title={hand.name}>{hand.name}</span>
      </div>
    </div>
  {/each}

  <div class="center" style:--after="{after}ms">
    {#if results.average === null}
      <p class="none">Nobody answered this Vote.</p>
    {:else}
      <p class="average">
        <span class="number">{average.current.toFixed(1)}</span>
        <span class="label">average of {results.hands.length}</span>
      </p>
    {/if}
    <ol class="bars" aria-label="Distribution">
      {#each results.distribution as count, i (i)}
        <li class="v{i + 1}" aria-label="{i + 1}: {count}">
          <span class="count">{count}</span>
          <span class="bar" style:--fill={count / most} style:--i={i}></span>
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
  .v1 { --c: var(--value-1); --ink: var(--ink-1); }
  .v2 { --c: var(--value-2); --ink: var(--ink-2); }
  .v3 { --c: var(--value-3); --ink: var(--ink-3); }
  .v4 { --c: var(--value-4); --ink: var(--ink-4); }
  .v5 { --c: var(--value-5); --ink: var(--ink-5); }

  .hand {
    position: absolute;
    width: calc(var(--size) * 1cqw);
    height: calc(var(--size) * 1cqw);
    margin: 0;
    translate: -50% -50%;
    --hand-ink: var(--ink);
    --hand-fill: var(--c);
    animation: pop 600ms var(--spring) var(--delay) both;
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
    color: var(--text);
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
    animation: fade 400ms var(--ease) var(--after) both;
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
    color: var(--muted);
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
    animation: grow 600ms var(--spring) calc(var(--after) + var(--i) * 70ms) both;
  }
  .count {
    color: var(--muted);
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
