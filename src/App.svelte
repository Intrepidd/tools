<script lang="ts">
  import { tick } from 'svelte'
  import Announcer from './Announcer.svelte'
  import Home from './Home.svelte'
  import RoomPage from './RoomPage.svelte'
  import { ACTIVITY_NAMES, parseRoute } from './lib/route'

  let route = $state(parseRoute(location.hash))

  $effect(() => {
    const onHashChange = async () => {
      route = parseRoute(location.hash)
      // A new view: move focus to its heading so screen readers start there (docs/accessibility.md, rule 5).
      await tick()
      document.querySelector<HTMLElement>('main h1')?.focus()
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  })

  $effect(() => {
    document.title = route.page === 'room' ? `${ACTIVITY_NAMES[route.activity]} · Workshop tools` : 'Workshop tools'
  })
</script>

<Announcer />

<main>
  {#if route.page === 'room'}
    {#key route.roomId}
      <RoomPage activity={route.activity} roomId={route.roomId} />
    {/key}
  {:else}
    <Home />
  {/if}
</main>
