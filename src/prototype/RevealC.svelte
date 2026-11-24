<!-- PROTOTYPE C — no hands at all: colored number bubbles orbiting a donut chart of the distribution. -->
<script lang="ts">
  import { placeHands } from '../lib/handCircle'
  import type { VoteResults } from '../room/room'

  const { results }: { results: VoteResults } = $props()
  const COLORS = ['#e4572e', '#f3a712', '#e9c46a', '#76b041', '#2a9d8f']

  // Sorted by value so the ring reads as a gradient from low to high.
  const sorted = $derived([...results.hands].sort((a, b) => a.value - b.value))
  const layout = $derived(placeHands(sorted.length))
  const donut = $derived.by(() => {
    const total = results.hands.length || 1
    let acc = 0
    const stops = results.distribution.map((c, v) => {
      const from = (acc / total) * 100
      acc += c
      return `${COLORS[v]} ${from}% ${(acc / total) * 100}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  })
</script>

<div class="stage" style:--size={layout.size}>
  <div class="donut" style:background={donut}>
    <div class="hole">
      <span class="avg">{results.average?.toFixed(1)}</span>
      <span class="sub">{results.hands.length} votes</span>
    </div>
  </div>

  {#each sorted as hand, i (hand.key)}
    {@const spot = layout.spots[i]}
    <div
      class="bubble"
      style:left="{spot.x}%"
      style:top="{spot.y}%"
      style:--c={COLORS[hand.value - 1]}
      style:--delay="{500 + i * Math.min(60, 700 / sorted.length)}ms"
    >
      <span class="num">{hand.value}</span>
      <span class="name">{hand.name}</span>
    </div>
  {/each}
</div>

<style>
  .stage {
    position: relative;
    width: min(100%, 80vh);
    aspect-ratio: 1;
    margin: 0 auto;
    container-type: size;
  }
  .donut {
    position: absolute;
    inset: 30%;
    border-radius: 50%;
    display: grid;
    place-items: center;
    animation: spin 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .hole {
    width: 68%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: #f7f7f5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .avg {
    font-size: 11cqw;
    font-weight: 800;
  }
  .sub {
    margin-top: 0.6cqw;
    font-size: max(0.7rem, 2cqw);
    color: #5c5c58;
  }
  .bubble {
    position: absolute;
    translate: -50% -50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: in 500ms cubic-bezier(0.34, 1.56, 0.64, 1) var(--delay) both;
  }
  .num {
    display: grid;
    place-items: center;
    width: calc(var(--size) * 0.62cqw);
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--c);
    color: #fff;
    font-size: calc(var(--size) * 0.32cqw);
    font-weight: 800;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--c) 45%, transparent);
  }
  .name {
    margin-top: 0.3rem;
    max-width: calc(var(--size) * 1cqw);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: clamp(0.6rem, calc(var(--size) * 0.12cqw), 0.95rem);
    font-weight: 600;
  }
  @keyframes spin {
    from {
      opacity: 0;
      rotate: -120deg;
      scale: 0.6;
    }
  }
  @keyframes in {
    from {
      opacity: 0;
      scale: 0.2;
    }
  }
</style>
