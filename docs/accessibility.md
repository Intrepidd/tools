# Accessibility standard

A member of our team is blind and uses a screen reader. Every screen, Activity and change must work fully with a screen reader and a keyboard, at WCAG 2.2 AA as the floor. This is a hard requirement: a change that breaks it is a bug, whatever else it adds. Background and sources: [research/accessibility.md](research/accessibility.md).

## Rules

### Announcements
1. **One Announcer, mounted once** at app load (`src/Announcer.svelte`), with one polite `role="status"` region and one `role="alert"` region. Never add another live region, and never mount a region at the moment of an update. Call `announce()` / `announceSoon()` from `src/lib/announcer.svelte.ts`.
2. **Coalesce peer events.** Joins, leaves, answers and Entries from other people are summarised every ~2 s ("Léa and Hugo joined", "5 of 8 have answered"). Never announce your own echoed action twice.
3. **Phase changes are announced once, politely**: Vote or round started, Reveal coming ("Revealing in 3 seconds", never each tick), and a one-sentence result summary.
4. `role="alert"` is for failures only (copy failed, Room unreachable).

### Structure and focus
5. Every view sets `document.title` and has exactly one `h1` with `tabindex="-1"`, focused after a route change.
6. **Move focus only after the user's own action**, never on a remote event. If the user's action removes the focused element, focus its natural successor (see the focus map in the research notes); otherwise the view's heading.
7. Presence is a `<ul>` with a counted name ("People in the room, 7"). Answered state and Entry counts are words, not only icons.

### Data and visuals
8. **Every visualisation has a full text equivalent** inside the same `<figure>`: the hands circle, the bar chart and the Word Cloud are `aria-hidden`, and a table or list carries the same data (zero rows kept). Animated numbers are `aria-hidden` with a static twin.
9. Decorative SVG (hands on buttons and cards, icons) is `aria-hidden="true"`. Meaningful standalone SVG gets `role="img"` and a name.

### Controls and forms
10. Use native elements: `<button>` for actions, `<a>` for navigation, radios in a `<fieldset>`/`<legend>` for single choice (the 0–5 picker). No `div` buttons, no positive `tabindex`.
11. Every input has a visible `<label>`. Hints and errors are linked with `aria-describedby`, errors set `aria-invalid="true"` and keep focus in the field. Don't disable a submit button to signal invalid input: let it explain why.
12. A button's accessible name stays stable while its visible text changes (e.g. "Copy invite link" → "Link copied"); confirm the result through the Announcer.

### Visual
13. Text 4.5:1, large text and control boundaries, focus rings, selected states and chart marks 3:1 against what is next to them. Pastels are fills behind dark text only, never text on paper. Check new colours with a contrast checker before adding them; `src/app.css` records the ratios.
14. State is never shown by colour alone: a selected value also gets a check mark and a thick dark border.
15. Focus ring: 3px solid `--text` outline, offset 2px (`outline`, not `box-shadow`, so it survives forced colours).
16. Targets at least 24×24 CSS px, 44×44 where it's cheap.
17. Under `prefers-reduced-motion`, skip the countdown, count-up and confetti and show final states. Haptics and confetti are extra feedback only, never the only signal.

## How it stays true

- `npm run check` fails on any Svelte a11y warning (`--fail-on-warnings`), and CI runs it.
- `npm test` runs axe on each component state (jsdom + `vitest-axe`) and asserts roles, names, focus and announcements with Testing Library. A new component or state ships with such a test.
- Code reviews check this standard explicitly; specs and tickets list accessibility in their acceptance criteria.
- Before a release, run the manual screen-reader script in the research notes (VoiceOver on macOS, and the teammate's own screen reader and browser first). Automated checks catch only part of the problems.
