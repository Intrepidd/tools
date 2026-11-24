<!-- PROTOTYPE A — keep the circle, swap the art: outline hands, name pills, playful pop-in. -->
<script lang="ts">
  import { placeHands } from '../lib/handCircle'
  import type { VoteResults } from '../room/room'
  import OutlineHand from './OutlineHand.svelte'

  const { results }: { results: VoteResults } = $props()
  const COLORS = ['#e4572e', '#f3a712', '#e9c46a', '#76b041', '#2a9d8f']
  const layout = $derived(placeHands(results.hands.length))
</script>

<div class="stage" style:--size={layout.size}>
  {#each results.hands as hand, i (hand.key)}
    {@const spot = layout.spots[i]}
    <div
      class="spot"
      style:left="{spot.x}%"
      style:top="{spot.y}%"
      style:--c={COLORS[hand.value - 1]}
      style:--delay="{i * Math.min(80, 900 / results.hands.length)}ms"
      style:--bob="{4 + (i % 3)}s"
    >
      <div class="bob">
        <div class="art"><OutlineHand value={hand.value} /></div>
        <span class="pill">{hand.name}</span>
      </div>
    </div>
  {/each}

  <div class="center">
    <span class="avg">{results.average?.toFixed(1)}</span>
    <div class="dist">
      {#each results.distribution as count, v (v)}
        <span style:--c={COLORS[v]} class:zero={count === 0}><b>{count}</b>×{v + 1}</span>
      {/each}
    </div>
  </div>
</div>

<style>
  .stage {
    position: relative;
    width: min(100%, 80vh);
    aspect-ratio: 1;
    margin: 0 auto;
    container-type: size;
  }
  .spot {
    position: absolute;
    width: calc(var(--size) * 1cqw);
    height: calc(var(--size) * 1cqw);
    translate: -50% -50%;
    --ink: color-mix(in srgb, var(--c) 70%, #222);
    --fill: color-mix(in srgb, var(--c) 22%, #fff);
    animation: pop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) var(--delay) both;
  }
  .bob {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    animation: bob var(--bob) ease-in-out infinite;
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
  }
  .center {
    position: absolute;
    inset: 32%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2cqw;
  }
  .avg {
    font-size: 14cqw;
    font-weight: 800;
    line-height: 1;
  }
  .dist {
    display: flex;
    gap: 1.2cqw;
    font-size: max(0.7rem, 2.2cqw);
  }
  .dist span {
    padding: 0.2em 0.5em;
    border-radius: 6px;
    background: color-mix(in srgb, var(--c) 25%, #fff);
  }
  .dist .zero {
    opacity: 0.35;
  }
  @keyframes pop {
    from {
      opacity: 0;
      scale: 0;
      rotate: -25deg;
    }
  }
  @keyframes bob {
    50% {
      transform: translateY(-1cqw) rotate(-3deg);
    }
  }
</style>
