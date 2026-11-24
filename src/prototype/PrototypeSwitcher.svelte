<!-- PROTOTYPE — throwaway floating variant switcher. Arrow keys cycle variants. -->
<script lang="ts">
  import type { Snippet } from 'svelte'

  const {
    label,
    onPrev,
    onNext,
    children,
  }: { label: string; onPrev: () => void; onNext: () => void; children?: Snippet } = $props()

  function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement
    if (t.closest('input, textarea, [contenteditable]')) return
    if (e.key === 'ArrowLeft') onPrev()
    if (e.key === 'ArrowRight') onNext()
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="bar">
  <button onclick={onPrev} aria-label="Previous variant">←</button>
  <span class="label">{label}</span>
  <button onclick={onNext} aria-label="Next variant">→</button>
  {#if children}<span class="sep"></span>{@render children()}{/if}
</div>

<style>
  .bar {
    position: fixed;
    left: 50%;
    bottom: 1rem;
    translate: -50% 0;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.5rem;
    border-radius: 999px;
    background: #111;
    color: #fff;
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.3);
    font: 600 0.85rem/1 ui-monospace, monospace;
    white-space: nowrap;
  }
  .label {
    padding: 0 0.4rem;
  }
  .sep {
    width: 1px;
    height: 1.2rem;
    background: #444;
  }
  .bar :global(button) {
    padding: 0.35rem 0.6rem;
    border-radius: 999px;
    background: #2a2a2a;
    color: #fff;
    font: inherit;
  }
  .bar :global(button.on) {
    background: #fff;
    color: #111;
  }
</style>
