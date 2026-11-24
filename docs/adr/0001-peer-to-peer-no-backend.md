# Peer-to-peer rooms, no backend

The app is a static site with no backend we own. A Room is the Facilitator's browser: it holds all state and is the only authority on it. Participants connect to it over WebRTC, and peers find each other through public signaling relays (Trystero over Nostr). We chose this to avoid running any server for a small internal workshop tool. The cost: a Room dies when the Facilitator leaves, and peers on strict corporate networks may fail to connect because there's no TURN relay.

## Considered Options

- **Hosted realtime (Cloudflare Durable Objects / PartyKit, Firebase, Supabase)**: works through any firewall and survives the Facilitator leaving, but it means a backend and an account. This is the fallback if P2P fails on the company network.
