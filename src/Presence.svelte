<script lang="ts">
  /** People as chips that pop in when they arrive and light up when they've answered. */
  import { flip } from 'svelte/animate'
  import { fade } from 'svelte/transition'
  import { initials, personColor } from './lib/juice'

  type Person = { key: number; name: string; isFacilitator?: boolean; done?: boolean; badge?: string | number }
  const { people, meKey }: { people: Person[]; meKey?: number } = $props()
</script>

<ul class="people">
  {#each people as p, i (p.key)}
    <li
      class="chip"
      class:done={p.done}
      class:me={p.key === meKey}
      style:--c={personColor(p.name)}
      style:--i={i}
      animate:flip={{ duration: 300 }}
      out:fade={{ duration: 200 }}
    >
      <span class="avatar" aria-hidden="true">
        {initials(p.name)}
        {#if p.done}
          <svg viewBox="0 0 16 16" class="check"><path d="M4 8.5l2.5 2.5L12 5.5" /></svg>
        {/if}
      </span>
      <span class="name">{p.name}</span>
      {#if p.key === meKey}<span class="tag">you</span>{/if}
      {#if p.isFacilitator}<span class="tag">facilitator</span>{/if}
      {#if p.badge !== undefined}
        {#key p.badge}<span class="badge">{p.badge}</span>{/key}
      {/if}
    </li>
  {/each}
</ul>

<style>
  .people {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 14px 0 4px;
    border-radius: 20px;
    background: var(--surface);
    box-shadow: inset 0 0 0 1px var(--line);
    font-size: 15px;
    animation: arrive var(--pop) var(--spring) both;
    transition: background-color var(--ui) var(--ease), box-shadow var(--ui) var(--ease);
  }
  .chip.done {
    background: color-mix(in srgb, var(--c) 45%, var(--surface));
    box-shadow: inset 0 0 0 1px transparent;
  }
  .chip.me {
    box-shadow: inset 0 0 0 2px var(--text);
  }
  .avatar {
    position: relative;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--c);
    font-size: 12px;
    font-weight: 600;
  }
  .check {
    position: absolute;
    inset: -4px -6px auto auto;
    width: 18px;
    height: 18px;
    padding: 2px;
    border-radius: 50%;
    background: var(--text);
    fill: none;
    stroke: var(--surface);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 12;
    animation: draw 300ms var(--ease) both, arrive var(--pop) var(--spring) both;
  }
  .tag {
    font-size: 12px;
    color: var(--muted);
  }
  .badge {
    min-width: 24px;
    height: 24px;
    padding: 0 8px;
    margin-right: -6px;
    border-radius: 12px;
    background: var(--text);
    color: var(--surface);
    font-size: 12px;
    font-weight: 600;
    line-height: 24px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    animation: bump 400ms var(--spring) both;
  }
  @keyframes arrive {
    0% {
      opacity: 0;
      transform: translateY(8px) scale(0.85) rotate(-4deg);
    }
    60% {
      transform: rotate(3deg);
    }
  }
  @keyframes bump {
    from {
      transform: scale(1.4);
    }
  }
  @keyframes draw {
    from {
      stroke-dashoffset: 12;
    }
  }
</style>
