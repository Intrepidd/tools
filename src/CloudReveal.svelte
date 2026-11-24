<script lang="ts">
  import { CLOUD_FONT, CLOUD_WEIGHT, layoutCloud } from './lib/cloudLayout'
  import type { CloudEntry } from './room/room'

  const { cloud }: { cloud: CloudEntry[] } = $props()

  const picture = $derived(layoutCloud(cloud))
  // Spread the entrance over at most ~0.9s, however many Entries there are.
  const stagger = $derived(Math.min(80, 900 / Math.max(1, cloud.length)))
</script>

<div class="stage">
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
          class="c{i % 5}"
          font-size={entry.size}
          text-anchor="middle"
          style:--delay="{i * stagger}ms"
        >
          <title>{entry.text}: {entry.count}</title>{entry.text}
        </text>
      </g>
    {/each}
  </svg>

  <ul class="sr-only">
    {#each cloud as entry (entry.text)}
      <li>{entry.text}: {entry.count}</li>
    {/each}
  </ul>
</div>

<style>
  .stage {
    margin: 1rem 0;
    overflow-x: clip; /* the pop-in overshoot must not widen the page */
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    max-height: 70vh;
    overflow: visible;
  }

  /* The house palette, darkened a little so light tints stay readable on the page. */
  .c0 { --c: #2a9d8f; }
  .c1 { --c: #e4572e; }
  .c2 { --c: #76b041; }
  .c3 { --c: #f3a712; }
  .c4 { --c: #e9c46a; }

  text {
    fill: color-mix(in srgb, var(--c) 78%, #222);
    transform-box: fill-box;
    transform-origin: center;
    animation: pop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) var(--delay) both;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @keyframes pop {
    from {
      opacity: 0;
      scale: 0;
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    text {
      animation: fade 200ms linear both;
    }
  }
</style>
