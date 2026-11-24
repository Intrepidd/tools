<script lang="ts">
  /** 3, 2, 1, a beat of stillness, then `onDone`. Builds anticipation before a Reveal. */
  const { onDone }: { onDone: () => void } = $props()

  const STEP = 650
  const BEAT = 220
  const COLORS: Record<number, string> = { 3: 'var(--value-1)', 2: 'var(--value-3)', 1: 'var(--value-5)' }
  let n = $state(3)

  $effect(() => {
    const timer = setInterval(() => {
      if (n > 1) n--
      else {
        clearInterval(timer)
        n = 0
        setTimeout(onDone, BEAT)
      }
    }, STEP)
    return () => clearInterval(timer)
  })
</script>

<!-- Silent for screen readers: the Room announces the Reveal once instead of each tick. -->
<div class="countdown" aria-hidden="true">
  {#key n}
    {#if n > 0}<span class="digit" style:--c={COLORS[n]}>{n}</span>{/if}
  {/key}
</div>

<style>
  .countdown {
    display: grid;
    place-items: center;
    height: min(60vh, 32rem);
  }
  .digit {
    grid-area: 1 / 1;
    display: grid;
    place-items: center;
    width: 10rem;
    height: 10rem;
    border-radius: 50%;
    background: var(--c);
    font-size: 6rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    animation: tick 650ms var(--spring) both;
  }
  @keyframes tick {
    0% {
      opacity: 0;
      transform: scale(1.5);
    }
    35% {
      opacity: 1;
      transform: scale(1);
    }
    85% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(0.8);
    }
  }
</style>
