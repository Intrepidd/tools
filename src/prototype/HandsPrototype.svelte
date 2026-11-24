<!--
  PROTOTYPE — throwaway. Question: what should the Fist of Five Reveal look like?
  Four variants on a dev-only page with fake results: #/prototype/hands, switch with ?variant=A..D and ?n=.
-->
<script lang="ts">
  import type { VoteResults } from '../room/room'
  import PrototypeSwitcher from './PrototypeSwitcher.svelte'
  import RevealA from './RevealA.svelte'
  import RevealB from './RevealB.svelte'
  import RevealC from './RevealC.svelte'
  import RevealD from './RevealD.svelte'

  const VARIANTS = [
    { key: 'A', name: 'Circle, outline hands', component: RevealA },
    { key: 'B', name: 'Columns by value', component: RevealB },
    { key: 'C', name: 'Number bubbles + donut', component: RevealC },
    { key: 'D', name: 'Scale with avatars', component: RevealD },
  ]
  const COUNTS = [5, 12, 30]

  const NAMES = [
    'Marie', 'Thomas', 'Léa', 'Hugo', 'Camille', 'Nicolas', 'Chloé', 'Julien', 'Sarah', 'Antoine',
    'Manon', 'Maxime', 'Inès', 'Alexandre', 'Emma', 'Lucas', 'Jade', 'Romain', 'Clara', 'Guillaume',
    'Zoé', 'Baptiste', 'Louise', 'Pierre-Emmanuel', 'Alice', 'Mathieu', 'Anaïs', 'Kevin', 'Juliette', 'Adrien',
  ]
  // Skewed toward 3–4, like a real team.
  const VALUES = [4, 3, 5, 4, 2, 4, 3, 4, 5, 3, 1, 4, 3, 4, 2, 5, 4, 3, 4, 3, 4, 5, 2, 4, 3, 4, 4, 3, 5, 3]

  function fakeResults(n: number): VoteResults {
    const hands = NAMES.slice(0, n).map((name, key) => ({ key, name, value: VALUES[key] }))
    const distribution = [1, 2, 3, 4, 5].map((v) => hands.filter((h) => h.value === v).length)
    const average = hands.reduce((s, h) => s + h.value, 0) / n
    return { hands, average, distribution }
  }

  const params = new URLSearchParams(location.search)
  let index = $state(Math.max(0, VARIANTS.findIndex((v) => v.key === params.get('variant'))))
  let n = $state(COUNTS.includes(Number(params.get('n'))) ? Number(params.get('n')) : 12)
  let replay = $state(0)

  const variant = $derived(VARIANTS[index])
  const results = $derived(fakeResults(n))

  $effect(() => {
    const p = new URLSearchParams({ variant: variant.key, n: String(n) })
    history.replaceState(null, '', `?${p}${location.hash}`)
  })
</script>

<div class="proto">
  {#key `${variant.key}-${n}-${replay}`}
    <variant.component {results} />
  {/key}
</div>

<PrototypeSwitcher
  label="{variant.key} ({variant.name})"
  onPrev={() => (index = (index + VARIANTS.length - 1) % VARIANTS.length)}
  onNext={() => (index = (index + 1) % VARIANTS.length)}
>
  {#each COUNTS as c (c)}
    <button class:on={n === c} onclick={() => (n = c)}>{c}</button>
  {/each}
  <button onclick={() => replay++} title="Replay the Reveal">↻</button>
</PrototypeSwitcher>

<style>
  .proto {
    padding-bottom: 5rem;
  }
</style>
