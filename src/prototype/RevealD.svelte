<!-- PROTOTYPE D — a 1–5 scale: initials avatars stack above their value, an average needle sweeps in. -->
<script lang="ts">
  import type { VoteResults } from '../room/room'

  const { results }: { results: VoteResults } = $props()
  const COLORS = ['#e4572e', '#f3a712', '#e9c46a', '#76b041', '#2a9d8f']
  const LABELS = ['Blocked', 'Worried', 'Unsure', 'Confident', 'All in']

  const columns = $derived([1, 2, 3, 4, 5].map((v) => results.hands.filter((h) => h.value === v)))
  const avgPos = $derived(results.average === null ? 0 : ((results.average - 1) / 4) * 80 + 10)
  const initials = (name: string) =>
    name
      .split(/[\s-]+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
</script>

<div class="wrap">
  <p class="headline">
    <b>{results.average?.toFixed(1)}</b>
    <span>{LABELS[Math.round(results.average ?? 1) - 1]}</span>
  </p>

  <div class="chart">
    {#each columns as people, v (v)}
      <div class="col" style:--c={COLORS[v]}>
        {#each people as p, i (p.key)}
          <span class="avatar" title={p.name} style:--delay="{200 + (v * 5 + i) * 35}ms">
            {initials(p.name)}
            <span class="tip">{p.name}</span>
          </span>
        {/each}
      </div>
    {/each}
    <div class="needle" style:left="{avgPos}%"></div>
  </div>

  <div class="scale">
    {#each LABELS as label, v (v)}
      <div style:--c={COLORS[v]}>
        <b>{v + 1}</b>
        <small>{label}</small>
      </div>
    {/each}
  </div>
</div>

<style>
  .wrap {
    max-width: 60rem;
    margin: 0 auto;
  }
  .headline {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.75rem;
    margin: 1rem 0 2rem;
  }
  .headline b {
    font-size: 4rem;
    line-height: 1;
  }
  .headline span {
    font-size: 1.4rem;
    color: #5c5c58;
  }
  .chart {
    position: relative;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    align-items: end;
    min-height: 12rem;
    padding: 0 0 0.5rem;
    border-bottom: 3px solid #1d1d1f;
  }
  .col {
    display: flex;
    flex-wrap: wrap-reverse;
    justify-content: center;
    gap: 0.3rem;
    padding: 0 0.5rem;
  }
  .avatar {
    position: relative;
    display: grid;
    place-items: center;
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 50%;
    background: var(--c);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 800;
    border: 2px solid #fff;
    animation: fall 500ms cubic-bezier(0.34, 1.4, 0.64, 1) var(--delay) both;
  }
  .tip {
    position: absolute;
    bottom: 110%;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    background: #1d1d1f;
    font-weight: 600;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
  }
  .avatar:hover .tip {
    opacity: 1;
  }
  .needle {
    position: absolute;
    top: -0.5rem;
    bottom: -0.5rem;
    width: 3px;
    translate: -50% 0;
    background: #1d1d1f;
    animation: sweep 1.4s cubic-bezier(0.22, 1, 0.36, 1) 600ms both;
  }
  .needle::before {
    content: '';
    position: absolute;
    top: -6px;
    left: -6px;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: #1d1d1f;
  }
  .scale {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    text-align: center;
    margin-top: 0.5rem;
  }
  .scale div {
    display: flex;
    flex-direction: column;
  }
  .scale b {
    font-size: 1.4rem;
    color: var(--c);
  }
  .scale small {
    color: #5c5c58;
  }
  @keyframes fall {
    from {
      opacity: 0;
      transform: translateY(-8rem);
    }
  }
  @keyframes sweep {
    from {
      left: 10%;
      opacity: 0;
    }
  }
</style>
