<script lang="ts">
  import { untrack } from 'svelte'
  import { MAX_NAME_LENGTH, viewFor, type Activity, type Message, type RoomView } from './room/room'
  import FistOfFive from './FistOfFive.svelte'
  import WordCloud from './WordCloud.svelte'
  import Presence from './Presence.svelte'
  import { runRoomAsFacilitator, joinAsParticipant, type ParticipantStatus } from './room/connection'
  import { ACTIVITY_NAMES, roomLink } from './lib/route'
  import { tap } from './lib/juice'
  import {
    hasJoined,
    loadRoomState,
    markJoined,
    participantId,
    saveDisplayName,
    saveRoomState,
    savedDisplayName,
  } from './lib/storage'

  // App re-creates this component when the Room changes, so these never change.
  const props: { activity: Activity; roomId: string } = $props()
  const { activity, roomId } = untrack(() => ({ ...props }))

  const myId = participantId()
  const stored = loadRoomState(roomId)
  const isFacilitator = stored?.facilitatorId === myId

  let view = $state<RoomView | null>(null)
  let status = $state<ParticipantStatus>('connecting')
  let name = $state(savedDisplayName())
  let joining = $state(!isFacilitator && hasJoined(roomId) && savedDisplayName() !== '')
  let copied = $state(false)
  let send: (message: Message) => void = () => {}

  const activityName = ACTIVITY_NAMES[stored?.activity ?? activity]
  const link = roomLink(stored?.activity ?? activity, roomId)
  const connected = $derived(isFacilitator || status === 'connected')

  // Facilitator: this browser is the Room.
  $effect(() => {
    if (!isFacilitator || !stored) return
    const hub = runRoomAsFacilitator(roomId, stored, (state) => {
      saveRoomState(roomId, state)
      view = viewFor(state, myId)
    })
    send = hub.send
    return hub.leave
  })

  // Participant: connect to the Facilitator once we have a name.
  $effect(() => {
    if (isFacilitator || !joining) return
    const connection = joinAsParticipant(
      roomId,
      myId,
      savedDisplayName(),
      (v) => (view = v),
      (s) => (status = s),
    )
    send = connection.send
    return connection.leave
  })

  function join(event: SubmitEvent) {
    event.preventDefault()
    if (!name.trim()) return
    tap()
    saveDisplayName(name)
    markJoined(roomId)
    joining = true
  }

  async function share() {
    tap()
    try {
      await navigator.clipboard.writeText(link)
      copied = true
      setTimeout(() => (copied = false), 1800)
    } catch {
      prompt('Copy this link:', link)
    }
  }
</script>

<header class="top">
  <a class="brand" href="#/">Workshop tools</a>
  {#if isFacilitator}
    <button type="button" class="share" class:copied onclick={share} aria-live="polite">
      {#if copied}
        <svg viewBox="0 0 16 16" class="icon draw"><path d="M3.5 8.5l3 3 6-7" /></svg>
        Link copied
      {:else}
        <svg viewBox="0 0 16 16" class="icon"><path d="M8 10V2.5M5 5.5l3-3 3 3M3 9v3.5h10V9" /></svg>
        Invite
      {/if}
    </button>
  {/if}
</header>

{#if !isFacilitator && !joining}
  <form class="join" onsubmit={join}>
    <h1>Join the {activityName}</h1>
    <p class="label">Pick the name your team will see</p>
    <div class="row">
      <input bind:value={name} maxlength={MAX_NAME_LENGTH} placeholder="Your name" aria-label="Your name" required />
      <button type="submit" disabled={!name.trim()}>Join</button>
    </div>
  </form>
{:else if !connected && status === 'unreachable'}
  <p class="status error">
    The Room is unreachable. The Facilitator may have left, or your network blocks peer-to-peer connections. This
    page reconnects on its own if they come back.
  </p>
{:else if !connected || !view}
  <p class="status"><span class="dots"><i></i><i></i><i></i></span> Connecting to the room</p>
{/if}

{#if view && connected}
  {#if view.activity === 'fist'}
    <FistOfFive vote={view.vote} {isFacilitator} participants={view.participants} meKey={view.me?.key} send={(m) => send(m)} />
  {:else}
    <WordCloud round={view.round} {isFacilitator} participants={view.participants} meKey={view.me?.key} send={(m) => send(m)} />
  {/if}
{/if}

<style>
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 72px;
    margin-bottom: 24px;
  }
  .brand {
    font-weight: 600;
    text-decoration: none;
  }
  .share {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 16px;
    border-radius: 20px;
  }
  .share.copied {
    background: var(--value-5);
    color: var(--text);
  }
  .icon {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.75;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .draw {
    stroke-dasharray: 16;
    animation: draw 260ms var(--ease) both;
  }
  @keyframes draw {
    from {
      stroke-dashoffset: 16;
    }
  }
  .join {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 28rem;
    margin: 12vh auto 0;
  }
  .join .row {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  .join input {
    flex: 1;
    min-width: 0;
  }
</style>
