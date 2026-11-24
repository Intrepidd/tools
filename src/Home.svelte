<script lang="ts">
  import Hand from './Hand.svelte'
  import { MAX_NAME_LENGTH, createRoom, type Activity } from './room/room'
  import { roomHash } from './lib/route'
  import { tap } from './lib/juice'
  import { participantId, randomId, saveDisplayName, saveRoomState, savedDisplayName } from './lib/storage'

  let name = $state(savedDisplayName())
  let nameError = $state('')
  let nameInput: HTMLInputElement | undefined = $state()

  function create(activity: Activity) {
    if (!name.trim()) {
      nameError = 'Enter your name first, so your team knows who is asking'
      nameInput?.focus()
      return
    }
    tap()
    const roomId = randomId()
    saveDisplayName(name)
    saveRoomState(roomId, createRoom(activity, participantId(), name))
    location.hash = roomHash(activity, roomId)
  }

  const WORDS = [
    { text: 'trust', size: 30, c: 5 },
    { text: 'focus', size: 20, c: 1 },
    { text: 'calm', size: 16, c: 3 },
    { text: 'ship it', size: 22, c: 4 },
    { text: 'fun', size: 15, c: 2 },
  ]
</script>

<header class="top"><span class="brand">Workshop tools</span></header>

<section class="hero">
  <h1 tabindex="-1">Ask your team, then reveal the answers together</h1>
  <p class="sub">Open a Room, share the link, and everyone answers from their own screen. Nothing shows until you say so.</p>

  <div class="name">
    <label for="home-name" class="label">Your name</label>
    <input
      id="home-name"
      bind:this={nameInput}
      bind:value={name}
      maxlength={MAX_NAME_LENGTH}
      autocomplete="nickname"
      spellcheck="false"
      placeholder="How the team knows you"
      aria-invalid={nameError ? 'true' : undefined}
      aria-describedby={nameError ? 'home-name-error' : undefined}
      oninput={() => (nameError = '')}
    />
    {#if nameError}<p id="home-name-error" class="error">{nameError}</p>{/if}
  </div>

  <div class="cards">
    <button type="button" class="card fist" aria-describedby="fist-desc" onclick={() => create('fist')}>
      <span class="hands" aria-hidden="true">
        {#each [2, 4, 5, 3] as v, i (i)}
          <span class="mini" style:--c="var(--value-{v})" style:--ink="var(--ink-{v})" style:--i={i}><Hand value={v} /></span>
        {/each}
      </span>
      <span class="title">New Fist of Five</span>
      <span class="desc" id="fist-desc" aria-hidden="true">Everyone rates 1 to 5 with a hand, then the hands appear in a circle</span>
    </button>

    <button type="button" class="card words" aria-describedby="cloud-desc" onclick={() => create('cloud')}>
      <span class="mini-cloud" aria-hidden="true">
        {#each WORDS as w, i (w.text)}
          <span style:font-size="{w.size}px" style:color="var(--ink-{w.c})" style:--i={i}>{w.text}</span>
        {/each}
      </span>
      <span class="title">New Word Cloud</span>
      <span class="desc" id="cloud-desc" aria-hidden="true">Everyone adds a few words, then the most common ones grow biggest</span>
    </button>
  </div>
</section>

<style>
  .top {
    display: flex;
    align-items: center;
    height: 72px;
  }
  .brand {
    font-weight: 600;
  }
  .hero {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 48rem;
    margin: 8vh auto 0;
  }
  h1 {
    font-size: clamp(2.25rem, 5.5vw, 4rem);
    letter-spacing: -0.03em;
    line-height: 1.02;
    animation: rise 600ms var(--ease) both;
  }
  .sub {
    max-width: 36rem;
    font-size: 19px;
    line-height: 1.5;
    color: var(--text-2);
    animation: rise 600ms var(--ease) 80ms both;
  }
  .name {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 24rem;
    margin-top: 24px;
    animation: rise 600ms var(--ease) 160ms both;
  }
  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 8px;
    animation: rise 600ms var(--ease) 240ms both;
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    height: auto;
    padding: 24px;
    border-radius: 24px;
    background: var(--surface);
    box-shadow: inset 0 0 0 1px var(--edge);
    color: var(--text);
    text-align: left;
  }
  .card:hover {
    transform: translateY(-4px);
    box-shadow: inset 0 0 0 1px var(--edge), 0 16px 32px -20px rgb(31 27 22 / 0.4);
  }
  .title {
    font-size: 22px;
    font-weight: 600;
  }
  .desc {
    font-size: 15px;
    font-weight: 400;
    color: var(--text-2);
  }
  .hands,
  .mini-cloud {
    display: flex;
    align-items: center;
    height: 96px;
    margin-bottom: 8px;
  }
  .mini {
    width: 64px;
    height: 64px;
    margin-right: -8px;
    --hand-fill: var(--c);
    --hand-ink: var(--ink);
    animation: bob 4s ease-in-out calc(var(--i) * -700ms) infinite;
  }
  .card:hover .mini {
    animation: wave 600ms var(--spring) calc(var(--i) * 60ms);
  }
  .mini-cloud {
    flex-wrap: wrap;
    gap: 0 10px;
    max-width: 14rem;
    font-weight: 650;
    line-height: 1.1;
  }
  .mini-cloud span {
    transition: transform var(--pop) var(--spring);
    transition-delay: calc(var(--i) * 40ms);
  }
  .card:hover .mini-cloud span {
    transform: scale(1.12);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
  }
  @keyframes bob {
    50% {
      transform: translateY(-4px) rotate(-3deg);
    }
  }
  @keyframes wave {
    40% {
      transform: translateY(-10px) rotate(-12deg);
    }
  }
  @media (max-width: 640px) {
    .cards {
      grid-template-columns: 1fr;
    }
  }
</style>
