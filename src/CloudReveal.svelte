<script lang="ts">
  import { CLOUD_FONT, CLOUD_WEIGHT, layoutCloud, type CloudPicture } from './lib/cloudLayout'
  import type { CloudEntry } from './room/room'

  const { cloud }: { cloud: CloudEntry[] } = $props()

  // Lay out only once the font has loaded, so every screen measures the same glyphs.
  let picture = $state<CloudPicture | null>(null)
  $effect(() => {
    const entries = cloud
    let live = true
    document.fonts
      .load(`${CLOUD_WEIGHT} 32px ${CLOUD_FONT}`)
      .catch(() => {})
      .then(() => live && (picture = layoutCloud(entries)))
    return () => (live = false)
  })

  // Largest first: the top three land slowly, one by one, then the rest shimmer in (capped ~2s).
  const delay = (i: number) => (i < 3 ? i * 180 : 540 + (i - 3) * Math.min(40, 1400 / cloud.length))
</script>

<div class="stage">
  {#if picture}
    <svg
      viewBox="{picture.box.x} {picture.box.y} {picture.box.width} {picture.box.height}"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      font-family={CLOUD_FONT}
      font-weight={CLOUD_WEIGHT}
    >
      {#each picture.entries as entry, i (entry.text)}
        <g transform="translate({entry.x} {entry.y})">
          <text
            style:--c="var(--ink-{(i % 5) + 1})"
            font-size={entry.size}
            text-anchor="middle"
            style:--delay="{delay(i)}ms"
          >
            <title>{entry.text}: {entry.count}</title>{entry.text}
          </text>
        </g>
      {/each}
    </svg>
  {/if}

  <ul class="sr-only">
    {#each cloud as entry (entry.text)}
      <li>{entry.text}: {entry.count}</li>
    {/each}
  </ul>
</div>

<style>
  .stage {
    min-height: 40vh;
    padding: 32px;
    border-radius: 24px;
    background: var(--surface);
    box-shadow: inset 0 0 0 1px var(--line);
    overflow: clip; /* the pop-in overshoot must not widen the page */
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    max-height: 65vh;
    overflow: visible;
  }

  text {
    fill: var(--c);
    transform-box: fill-box;
    transform-origin: center;
    animation: land 700ms var(--spring) var(--delay) both;
  }

  @keyframes land {
    from {
      opacity: 0;
      scale: 0.6;
      filter: blur(6px);
    }
  }
</style>
