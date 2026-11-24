<script lang="ts">
  import { untrack } from 'svelte'
  import { MAX_NAME_LENGTH, viewFor, type Activity, type Message, type RoomView } from './room/room'
  import FistOfFive from './FistOfFive.svelte'
  import WordCloud from './WordCloud.svelte'
  import Presence from './Presence.svelte'
  import { runRoomAsFacilitator, joinAsParticipant, type ParticipantStatus } from './room/connection'
  import { ACTIVITY_NAMES, roomLink } from './lib/route'
  import { tap } from './lib/juice'
  import { alertNow, announce, announceSoon } from './lib/announcer.svelte'
  import { roomNews } from './lib/roomNews'
  import { tick } from 'svelte'
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
  let copyFailed = $state(false)
  let nameError = $state('')
  let send: (message: Message) => void = () => {}

  const activityName = ACTIVITY_NAMES[stored?.activity ?? activity]
  const link = roomLink(stored?.activity ?? activity, roomId)
  const connected = $derived(isFacilitator || status === 'connected')

  // Tell screen readers what changed in the Room (docs/accessibility.md, rules 2–3).
  let previous: RoomView | null = null
  $effect(() => {
    if (!view) return
    const news = roomNews(previous, view, isFacilitator)
    news.now.forEach(announce)
    news.soon.forEach((n) => announceSoon(n.text, n.key))
    previous = view
  })

  // Connection changes, for Participants.
  let lastStatus: ParticipantStatus = 'connecting'
  $effect(() => {
    if (status === lastStatus) return
    if (status === 'unreachable') alertNow('The Room is unreachable. This page reconnects on its own.')
    else if (status === 'connected' && lastStatus === 'unreachable') announce('Reconnected to the Room')
    lastStatus = status
  })

  // After joining, land on the Activity's heading once it appears.
  let focusWhenReady = false
  $effect(() => {
    if (!focusWhenReady || !view || !connected) return
    focusWhenReady = false
    tick().then(() => document.querySelector<HTMLElement>('main h1')?.focus())
  })

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
    if (!name.trim()) {
      nameError = 'Enter your name to join'
      return
    }
    nameError = ''
    tap()
    focusWhenReady = true
    saveDisplayName(name)
    markJoined(roomId)
    joining = true
  }

  async function share() {
    tap()
    try {
      await navigator.clipboard.writeText(link)
      copied = true
      announce('Invite link copied')
      setTimeout(() => (copied = false), 2000)
    } catch {
      copyFailed = true
      alertNow(`Couldn't copy the invite link. It is shown below the header: ${link}`)
    }
  }
</script>

<header class="top">
  <a class="brand" href="#/">Workshop tools</a>
  {#if isFacilitator}
    <button type="button" class="share" class:copied onclick={share} aria-label="Copy invite link">
      {#if copied}
        <svg viewBox="0 0 16 16" class="icon draw" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>
        Link copied
      {:else}
        <svg viewBox="0 0 16 16" class="icon" aria-hidden="true"><path d="M8 10V2.5M5 5.5l3-3 3 3M3 9v3.5h10V9" /></svg>
        Invite
      {/if}
    </button>
  {/if}
</header>

{#if copyFailed}
  <div class="fallback">
    <label for="invite-link" class="label">Invite link, select and copy it</label>
    <input id="invite-link" readonly value={link} onfocus={(e) => e.currentTarget.select()} />
  </div>
{/if}

{#if !isFacilitator && !joining}
  <form class="join" onsubmit={join} novalidate>
    <h1 tabindex="-1">Join the {activityName}</h1>
    <label for="join-name" class="label">Your name, as your team will see it</label>
    <div class="row">
      <input
        id="join-name"
        bind:value={name}
        maxlength={MAX_NAME_LENGTH}
        autocomplete="nickname"
        spellcheck="false"
        aria-invalid={nameError ? 'true' : undefined}
        aria-describedby={nameError ? 'join-name-error' : undefined}
      />
      <button type="submit">Join</button>
    </div>
    {#if nameError}<p id="join-name-error" class="error">{nameError}</p>{/if}
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
  }
  .fallback {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 24px;
  }
  .join input {
    flex: 1;
    min-width: 0;
  }
</style>
