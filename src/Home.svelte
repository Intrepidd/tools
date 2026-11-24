<script lang="ts">
  import { MAX_NAME_LENGTH, createRoom, type Activity } from './room/room'
  import { ACTIVITY_NAMES, roomHash } from './lib/route'
  import { participantId, randomId, saveDisplayName, saveRoomState, savedDisplayName } from './lib/storage'

  let name = $state(savedDisplayName())

  function create(activity: Activity) {
    const roomId = randomId()
    saveDisplayName(name)
    saveRoomState(roomId, createRoom(activity, participantId(), name))
    location.hash = roomHash(activity, roomId)
  }
</script>

<h1>Workshop Tools</h1>
<p>Create a Room, share its link, and run a live Activity with your team.</p>

<form onsubmit={(e) => e.preventDefault()}>
  <label>
    Your display name
    <input bind:value={name} maxlength={MAX_NAME_LENGTH} placeholder="e.g. Alex" required />
  </label>
  <div class="actions">
    {#each Object.entries(ACTIVITY_NAMES) as [activity, label] (activity)}
      <button type="button" disabled={!name.trim()} onclick={() => create(activity as Activity)}>
        New {label} Room
      </button>
    {/each}
  </div>
</form>
