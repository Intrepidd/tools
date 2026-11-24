<script lang="ts">
  import Home from './Home.svelte'
  import RoomPage from './RoomPage.svelte'
  import { parseRoute } from './lib/route'
  import HandsPrototype from './prototype/HandsPrototype.svelte'

  let route = $state(parseRoute(location.hash))
  // PROTOTYPE: dev-only Reveal variants page, never in production builds.
  let hash = $state(location.hash)

  $effect(() => {
    const onHashChange = () => {
      route = parseRoute(location.hash)
      hash = location.hash
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  })
</script>

<main>
  {#if import.meta.env.DEV && hash === '#/prototype/hands'}
    <HandsPrototype />
  {:else if route.page === 'room'}
    {#key route.roomId}
      <RoomPage activity={route.activity} roomId={route.roomId} />
    {/key}
  {:else}
    <Home />
  {/if}
</main>
