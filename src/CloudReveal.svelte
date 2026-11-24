<script lang="ts">
  import { CLOUD_FONT, CLOUD_WEIGHT, layoutCloud, type CloudPicture } from './lib/cloudLayout'
  import type { CloudEntry } from './room/room'

  const { cloud }: { cloud: CloudEntry[] } = $props()

  // Lay out only once the font has loaded, so every screen measures the same glyphs.
  let picture = $state<CloudPicture | null>(null)
  $effect(() => {
    const entries = cloud
    let live = true
    Promise.resolve(document.fonts?.load(`${CLOUD_WEIGHT} 32px ${CLOUD_FONT}`))
      .catch(() => {})
      .then(() => {
        // No canvas (e.g. a test DOM) means no picture; the list below still carries everything.
        try {
          if (live) picture = layoutCloud(entries)
        } catch {}
      })
    return () => (live = false)
  })

  // Largest first: the top three land slowly, one by one, then the rest shimmer in (capped ~2s).
  const delay = (i: number) => (i < 3 ? i * 180 : 540 + (i - 3) * Math.min(40, 1400 / cloud.length))
</script>

<figure class="results" aria-labelledby="results-heading">
<h2 id="results-heading" tabindex="-1">Results</h2>

<!-- The cloud is a picture of the list below, so screen readers skip it. -->
<div class="stage" aria-hidden="true">
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

</div>

<details class="list">
  <summary>Show the Entries as a list, most common first</summary>
  <ol>
    {#each cloud as entry (entry.text)}
      <li>{entry.text}, {entry.count} {entry.count === 1 ? 'time' : 'times'}</li>
    {/each}
  </ol>
</details>
</figure>

<style>
  .results {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h2 {
    font-size: 15px;
    font-weight: 500;
    letter-spacing: 0;
    color: var(--text-2);
  }
  .list summary {
    width: fit-content;
    padding: 8px 0;
    cursor: pointer;
    color: var(--text-2);
  }
  .list ol {
    margin: 8px 0 0;
    padding-left: 24px;
    line-height: 1.8;
  }
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
