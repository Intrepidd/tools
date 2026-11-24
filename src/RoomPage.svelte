<script lang="ts">
  import { untrack } from 'svelte'
  import { MAX_NAME_LENGTH, viewFor, type Activity, type Message, type RoomView } from './room/room'
  import FistOfFive from './FistOfFive.svelte'
  import WordCloud from './WordCloud.svelte'
  import { runRoomAsFacilitator, joinAsParticipant, type ParticipantStatus } from './room/connection'
  import { ACTIVITY_NAMES, roomLink } from './lib/route'
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

  const link = roomLink(stored?.activity ?? activity, roomId)

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
    saveDisplayName(name)
    markJoined(roomId)
    joining = true
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      copied = true
      setTimeout(() => (copied = false), 2000)
    } catch {
      prompt('Copy this link:', link)
    }
  }
</script>

<p><a href="#/">Workshop Tools</a></p>
<h1>{ACTIVITY_NAMES[view?.activity ?? stored?.activity ?? activity]}</h1>

{#if isFacilitator}
  <section class="share">
    <p>Share this link so Participants can join:</p>
    <div class="link">
      <input readonly value={link} onfocus={(e) => e.currentTarget.select()} />
      <button type="button" onclick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
    </div>
  </section>
{:else if !joining}
  <form onsubmit={join}>
    <label>
      Your display name
      <input bind:value={name} maxlength={MAX_NAME_LENGTH} placeholder="e.g. Alex" required />
    </label>
    <button type="submit" disabled={!name.trim()}>Join the Room</button>
  </form>
{:else if status === 'connecting' && !view}
  <p class="status">Connecting to the Facilitator…</p>
{:else if status === 'unreachable'}
  <p class="status error">
    The Room is unreachable: the Facilitator may have left or your network may block peer-to-peer
    connections. We will reconnect automatically if they come back.
  </p>
{/if}

{#if view?.activity === 'fist' && (isFacilitator || status === 'connected')}
  <FistOfFive vote={view.vote} {isFacilitator} send={(m) => send(m)} />
{:else if view?.activity === 'cloud' && (isFacilitator || status === 'connected')}
  <WordCloud round={view.round} {isFacilitator} send={(m) => send(m)} />
{/if}

{#if view}
  <section>
    <h2>Here now ({view.participants.length})</h2>
    <ul class="participants">
      {#each view.participants as person (person.key)}
        <li>
          {person.name}
          {#if person.isFacilitator}<span class="tag">Facilitator</span>{/if}
          {#if person.key === view.me?.key}<span class="tag">you</span>{/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}
