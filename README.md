# Workshop Tools

Live browser activities (Fist of Five, Word Cloud) a Facilitator runs with a team. Static site, no backend: the Facilitator's browser is the Room and Participants connect to it peer-to-peer over WebRTC (Trystero, Nostr signaling). See `GLOSSARY.md` and `docs/adr/`.

## Develop

Requires Node 22+.

```sh
npm install
npm run dev      # dev server at http://localhost:5173
npm test         # Vitest, runs the Room core tests
npm run check    # svelte-check type checking
npm run build    # static bundle in dist/
npm run preview  # serve dist/ locally
```

To try a Room, open the app, create a Room, and open the join link in another browser or a private window (the same browser profile shares the Facilitator's storage).

## Layout

- `src/room/room.ts`: the pure Room core, `apply(roomState, message, fromParticipantId)` and `viewFor(roomState, participantId)`, for both Activities (Fist of Five Votes, Word Cloud rounds). Tested.
- `src/room/peers.ts`: the hub's pure binding of each Trystero peer to one Participant ID. Tested.
- `src/room/connection.ts`: the Trystero star. The Facilitator's browser is the hub and runs the Room; Participants send only to it and receive only their own view, where other people appear under opaque keys, never their Participant IDs.
- `src/*.svelte`: UI. Routing is by hash: `#/fist/<roomId>`, `#/cloud/<roomId>`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes `dist/` to GitHub Pages. In the repo settings, set Pages to deploy from GitHub Actions. Vite uses a relative `base`, so the bundle works under `/tools/`.
