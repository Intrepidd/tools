<script lang="ts">
  /** A Hand showing `value` (1–5) raised fingers: index, middle, ring, pinky, then thumb. */
  const { value }: { value: number } = $props()

  // Index, middle, ring, pinky: horizontal position and how high the raised fingertip reaches.
  const fingers = [
    { x: 28, top: 14 },
    { x: 41, top: 6 },
    { x: 54, top: 11 },
    { x: 67, top: 24 },
  ]
</script>

<svg viewBox="0 0 100 110" role="img" aria-label="{value} {value === 1 ? 'finger' : 'fingers'}">
  <g class="skin">
    {#each fingers as f, i (i)}
      {#if value > i}
        <rect x={f.x} y={f.top} width="12" height={66 - f.top} rx="6" />
      {:else}
        <rect x={f.x} y="40" width="12" height="24" rx="6" />
      {/if}
    {/each}
    {#if value >= 5}
      <rect x="17" y="50" width="14" height="40" rx="7" transform="rotate(-30 24 88)" />
    {/if}
    <rect x="22" y="52" width="60" height="52" rx="16" />
    {#if value < 5}
      <rect x="26" y="70" width="36" height="13" rx="6.5" />
    {/if}
  </g>
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .skin rect {
    fill: var(--hand-fill, #f3e6d8);
    stroke: var(--hand-ink, #5c4a3a);
    stroke-width: 3.5;
    stroke-linejoin: round;
  }
</style>
