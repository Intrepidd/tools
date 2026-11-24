<script lang="ts">
  import Home from './Home.svelte'
  import RoomPage from './RoomPage.svelte'
  import { parseRoute } from './lib/route'

  let route = $state(parseRoute(location.hash))

  $effect(() => {
    const onHashChange = () => (route = parseRoute(location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  })
</script>

<main>
  {#if route.page === 'room'}
    {#key route.roomId}
      <RoomPage activity={route.activity} roomId={route.roomId} />
    {/key}
  {:else}
    <Home />
  {/if}
</main>
