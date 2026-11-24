<script lang="ts">
  /** A Hand showing `value` (0–5) raised fingers: index, middle, ring, pinky, then thumb. 0 is a fist. */
  const { value }: { value: number } = $props()

  // Index, middle, ring, pinky: horizontal position and how high the raised fingertip reaches.
  const FINGERS = [
    { x: 34, top: 17 },
    { x: 46, top: 9 },
    { x: 58, top: 13 },
    { x: 70, top: 24 },
  ]
  // Folded fingers show as short knuckles above the palm.
  const fingers = $derived(FINGERS.map((f, i) => ({ x: f.x, top: value > i ? f.top : 46 })))
</script>

{#if value === 0}
<svg viewBox="0 0 100 100" role="img" aria-label="a fist">
  <!-- Front view: curled fingers on top, the thumb laid across them. -->
  <rect x="24" y="50" width="56" height="42" rx="16" class="palm" />
  <rect x="27" y="30" width="14" height="30" rx="7" class="palm" />
  <rect x="39" y="26" width="14" height="32" rx="7" class="palm" />
  <rect x="51" y="28" width="14" height="31" rx="7" class="palm" />
  <rect x="63" y="33" width="14" height="27" rx="7" class="palm" />
  <rect x="20" y="58" width="46" height="15" rx="7.5" transform="rotate(-12 43 65)" class="palm" />
</svg>
{:else}
<!-- Fingers are stroked twice (ink, then fill on top of the palm) so they merge cleanly into it. -->
<svg viewBox="0 0 100 100" role="img" aria-label="{value} {value === 1 ? 'finger' : 'fingers'}">
  <g stroke-linecap="round">
    {#each fingers as f, i (i)}
      <line x1={f.x} y1="60" x2={f.x} y2={f.top} class="ink" stroke-width="14" />
    {/each}
    {#if value >= 5}
      <line x1="31" y1="74" x2="13" y2="52" class="ink" stroke-width="15" />
    {/if}
  </g>
  <rect x="26" y="48" width="52" height="44" rx="17" class="palm" />
  <g stroke-linecap="round">
    {#each fingers as f, i (i)}
      <line x1={f.x} y1="62" x2={f.x} y2={f.top} class="fill" stroke-width="7.5" />
    {/each}
    {#if value >= 5}
      <line x1="33" y1="76" x2="13" y2="52" class="fill" stroke-width="8.5" />
    {/if}
  </g>
</svg>
{/if}

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .ink {
    stroke: var(--hand-ink, #333);
  }
  .fill {
    stroke: var(--hand-fill, #fff);
  }
  .palm {
    fill: var(--hand-fill, #fff);
    stroke: var(--hand-ink, #333);
    stroke-width: 3.25;
  }
</style>
