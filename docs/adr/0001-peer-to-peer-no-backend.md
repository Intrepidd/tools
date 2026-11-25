# Peer-to-peer rooms, no backend

The app is a static site with no backend we own. A Room is the Facilitator's browser: it holds all state and is the only authority on it. Participants connect to it over WebRTC, and peers find each other through public signaling relays (Trystero over Nostr). We chose this to avoid running any server for a small internal workshop tool. The cost: a Room dies when the Facilitator leaves, and peers that can't reach each other directly depend on a TURN relay.

That relay is Metered's free TURN plan (500 MB/month, plenty for small JSON messages). We added it after phones failed to connect even on the same Wi-Fi as a working desktop (mDNS host candidates blocked, no NAT hairpinning). Its ICE servers array, static credentials included, comes from the `ICE_SERVERS` GitHub Actions secret at build time and is added to Trystero's default STUN servers. The credentials are public in the bundle, which we accept for a small internal tool. Without the secret, the app builds and runs STUN-only, and those peers can't connect.

## Considered Options

- **Hosted realtime (Cloudflare Durable Objects / PartyKit, Firebase, Supabase)**: works through any firewall and survives the Facilitator leaving, but it means a backend and an account. This is the fallback if P2P fails on the company network.
