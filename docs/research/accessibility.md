# Accessibility research: Fist of Five / Word Cloud workshop app (Svelte 5, WebRTC)

Target: WCAG 2.2 AA as the minimum, with AAA where it costs little. One teammate is blind and uses a screen reader, so screen-reader UX matters more here than passing audits.

Legend: **[src]** = claim backed by the linked source. **[judgement]** = my own recommendation or inference, not taken from a source.

---

## 0. Relevant WCAG 2.2 success criteria (quick map)

| SC | Level | Why it matters here |
|---|---|---|
| 1.1.1 Non-text content | A | Hand SVGs, word cloud, chart |
| 1.3.1 Info & relationships | A | Chart/table structure, form labels, group labels |
| 1.4.1 Use of colour | A | Pastel colours must not be the only way to show selection |
| 1.4.3 Contrast (minimum) | AA | Text 4.5:1, large text 3:1 |
| 1.4.11 Non-text contrast | AA | UI component boundaries, states, chart bars: 3:1 |
| 2.1.1 Keyboard | A | Everything operable by keyboard |
| 2.2.2 Pause, Stop, Hide | A | Auto-moving content lasting more than 5s (confetti, presence animations) |
| 2.3.3 Animation from interactions | AAA (cheap) | Honour `prefers-reduced-motion` |
| 2.4.2 Page titled | A | `document.title` per view |
| 2.4.3 Focus order | A | Focus management after actions |
| 2.4.7 Focus visible | AA | Visible focus indicator |
| 2.4.11 Focus not obscured (min) | AA | Sticky headers/toasts must not fully cover focus |
| 2.4.13 Focus appearance | AAA (cheap) | 2px perimeter, 3:1 change |
| 2.5.8 Target size (min) | AA | 24×24 CSS px |
| 3.3.1 / 3.3.2 Error identification / Labels | A | Name field, entry field |
| 4.1.2 Name, role, value | A | Toggle state, dynamic labels |
| 4.1.3 Status messages | AA | Live announcements for joins, answers, copy, reveal |

Sources:
- https://www.w3.org/TR/WCAG22/
- 2.4.11: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- 2.4.13: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- 2.5.8: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

---

## 1. Live regions for real-time collaborative updates

### Sourced facts
- **Render the live region before you put content in it.** Keep an empty region in the DOM from page load and inject text into it later. Injecting a new region along with its text, or switching it from `display:none` to visible, usually goes unannounced because the region was not in the accessibility tree yet. Use as few live regions as possible. [src] Scott O'Hara, "Are we live?" https://www.scottohara.me/blog/2022/02/05/are-we-live.html
- `role="status"` implies `aria-live="polite"` plus atomic, for advisory messages. `role="alert"` implies assertive plus atomic, for urgent messages and errors only; NVDA prefixes it with "Alert". `role="log"` is polite and non-atomic, for appended, ordered content such as chat, where new content goes at the end only. `marquee` and `timer` have poor support. `alert` and `status` have the best support. [src] Sara Soueidan part 1 https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/
- Support for `aria-atomic`, `aria-relevant` and `aria-busy` is inconsistent, so don't rely on them. Only JAWS honours `aria-busy`. [src] Soueidan part 1.
- **Use at most two live regions, one polite and one assertive, created on load.** Several regions interfere with each other, and an assertive update can clear queued polite ones (the ARIA spec says "changes in an assertive region may remove all currently queued changes"). Missed messages are gone for good. [src] Soueidan part 2 https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-2/
- To avoid duplicate or odd announcements, clear the region between messages and insert the new text in one go after a short delay (about 350–500 ms in her examples). Live content is read as flat text, so interactive elements inside it lose their roles. Regions hidden with `display:none` or `aria-hidden` are not announced, so use a visually-hidden CSS class. [src] Soueidan part 2.
- Alternatives to live regions: set expectations up front with instructions, move focus on user-initiated actions only (never on async events), and use `aria-pressed`/`aria-expanded` for state changes instead of announcing them. [src] Soueidan part 2.
- WCAG 4.1.3 Status Messages (AA): status messages must be programmatically determinable through role or properties so they can be presented without receiving focus. [src] https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- Behaviour across browsers and screen readers varies and changes between versions, so retest regularly. NerdeRegion (a browser extension) helps show what was actually announced. [src] O'Hara; Soueidan part 2.

### Design for this app [judgement]
- **One `Announcer` component mounted once in the root layout**, with two visually-hidden regions: `<div role="status">` (polite) and `<div role="alert">` (assertive, kept almost unused). Expose `announce(msg, {priority})` from a module-level store. The regions must not be `{#if}`-ed in or out.
- **Coalesce remote events.** Peer events (join, leave, "X answered", "X added an entry") go into a buffer, and the buffer is flushed as **one summary message every ~2–3 s**:
  - 1 event: "Alice joined."
  - Several: "3 people joined: Alice, Bob, Chen." Beyond ~3 names: "5 people joined. 8 in the room."
  - Answers: "4 of 7 have voted." Don't name who voted (it's noisy, and the names are already in the chips list).
  - Never announce your own echo, e.g. your own vote coming back over WebRTC.
- **Facilitator vs participant verbosity.** Mostly only the facilitator needs progress ("6 of 7 answered"). Participants need "Vote started", "Reveal in 3", the results, and "Vote reset". Consider a "Quiet updates" checkbox that mutes peer progress announcements while keeping phase changes. This is the cheap "aim higher" option.
- **Phase changes** (vote started, reveal) are important but not errors. Use polite, and keep them short. A typing user would find assertive disruptive.
- **Countdown 3-2-1.** Don't announce each tick: three messages in ~3 s will queue or be dropped. Announce once, "Revealing results in 3 seconds", then announce the result summary when the reveal lands. With reduced motion, or as a user setting, skip the countdown entirely.
- **Reveal results announcement.** Keep it to one concise sentence, e.g. "Results: average 3.6 from 7 votes. Most common: 4 (3 people)." The full detail goes in a real table or list that the user can navigate to (§2). Don't announce the counting-up average. Announce the final value only, and mark the animated number `aria-hidden` with a static text twin.
- **Persistent history (beyond AA).** Because live messages are transient, a visible, collapsible "Activity" list (`<ol>`, not live) gives a screen-reader user a way to review what they missed. [judgement, supported by Soueidan's "prefer persistent" advice]
- **Emerging option:** `document.ariaNotify()` (Microsoft-led proposal, shipping in Chromium-based browsers) queues announcements without DOM regions. Use it only as progressive enhancement behind a feature check, with the DOM regions as fallback. [judgement, verify support before relying on it] Explainer: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/Accessibility/AriaNotify/explainer.md

Sketch:
```svelte
<!-- Announcer.svelte, mounted once in +layout.svelte -->
<script>
  import { politeMsg, assertiveMsg } from './announcer.svelte.js';
</script>
<div class="sr-only" role="status">{politeMsg.value}</div>
<div class="sr-only" role="alert">{assertiveMsg.value}</div>
```
```js
// announcer.svelte.js
export const politeMsg = $state({ value: '' });
let buf = [], timer;
export function announce(text) {           // direct, deduped by clearing
  politeMsg.value = '';
  setTimeout(() => (politeMsg.value = text), 100);
}
export function queuePeerEvent(evt) {       // coalesced
  buf.push(evt);
  clearTimeout(timer);
  timer = setTimeout(() => { announce(summarise(buf)); buf = []; }, 2000);
}
```

---

## 2. Accessible data visualisation

### Sourced facts
- Complex images such as charts need a short description (what it is) plus a long description that carries the data. A long description can live inside `<figure>`/`<figcaption>`, including a data table, and should be visible to everyone rather than hidden. `aria-describedby` flattens structure (no table navigation), so use it only for plain text. [src] W3C WAI Images Tutorial, Complex images https://www.w3.org/WAI/tutorials/images/complex/
- Prefer native HTML semantics (`table`, `figure`, `img`) over ARIA roles. [src] APG structural roles https://www.w3.org/WAI/ARIA/apg/practices/structural-roles/
- ARIA table roles inside SVG (`role="table/row/cell"`) are a known technique, but support is inconsistent: NVDA struggles, JAWS is partial in Firefox, VoiceOver/Safari is good. Watson herself recommends an additional tabular view. [src] Léonie Watson https://tink.uk/accessible-svg-line-graphs/
- Decorative SVG gets `aria-hidden="true"` (and `focusable="false"` for legacy). An informative standalone SVG gets `role="img"` plus `<title>` or `aria-label`. [src] Deque/Carie Fisher, "Creating accessible SVGs" https://www.deque.com/blog/creating-accessible-svgs/

### Design for this app [judgement]
For each reveal, put the visual and the text equivalent inside one `<figure>`, with the visual hidden from AT and a real HTML structure next to it. The text equivalent can be visible (good for everyone, e.g. a "Show as table" disclosure) or visually hidden. A visible version is better and aids cognition.

- **Hands circle:** `aria-hidden="true"` on the whole SVG/CSS circle. Equivalent: `<ul>` sorted by value, "Alice: 4", "Bob: 2". If votes are anonymous, list the counts only.
- **Bar chart 1–5:** `aria-hidden` SVG plus `<table><caption>Votes by value</caption>` with header row Value | Votes | Who, and five rows including zero rows. Zero counts matter.
- **Average:** the visual count-up number is `aria-hidden`. A static `<p>Average: 3.6 out of 5 (7 votes)</p>` is exposed. Optional extras: min, max, spread (e.g. "Range 2–5; two people at 2"). These help facilitation for everyone.
- **Word cloud (d3-cloud):** the SVG is `aria-hidden`. The equivalent is an `<ol>` of words sorted by count descending, "deadline: 5 mentions". Cloud position and rotation carry no meaning, so a frequency list is a *complete* equivalent. Cap it with "Show all N words" if long.
- **Figure caption** states the takeaway: "Fist of Five results: average 3.6, 7 votes."
- **Heading** "Results" (h2) at the top of the reveal region, so SR users can jump to it with H, and focus can land on it (§3).
- **Hand SVGs on the picker buttons** are decorative because the button's text label carries the meaning: `aria-hidden="true"`.
- **Confetti canvas:** `aria-hidden="true"`, `pointer-events:none`, no fallback content.
- **Sonification:** optional, low priority. If added, it must be opt-in and off by default, because it would collide with speech output.

---

## 3. Toggle-button groups, focus management, SPA routes

### Sourced facts
- APG Button pattern: a toggle button uses `aria-pressed="true|false"`, and **its label must not change when the state changes**. If the label changes, drop `aria-pressed`. [src] https://www.w3.org/WAI/ARIA/apg/patterns/button/
- APG Radio Group: one Tab stop for the whole group. Arrow keys move focus *and* check, wrapping around. Space checks. [src] https://www.w3.org/WAI/ARIA/apg/patterns/radio/
- Roselli: use a toggle button when the change takes immediate effect via JS. Use form controls (checkbox/radio) when the change is applied on submit. [src] https://adrianroselli.com/2021/10/switch-role-support.html
- Moving focus is fine in response to the user's own action and should be avoided on async events. For SPA route changes, focus the main `<h1>`. [src] Soueidan part 2.
- Gatsby / Marcy Sutton user testing of client-side routing: focusing a heading worked best, a wrapper was acceptable, and resetting focus to the top of the document overwhelmed users. Also announce the new page name in a live region present from load. [src] https://www.gatsbyjs.com/blog/2019-07-11-user-testing-accessible-client-routing/
- WCAG 2.4.2: each view needs a descriptive title. [src] https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html

### 1–5 picker: radio group, not five toggle buttons [judgement, grounded in APG semantics]
The choice is mutually exclusive, a single choice out of five, which is exactly radio semantics: "radio, 4 of 5, checked" tells a SR user that the choice is single and how many options exist. Five `aria-pressed` buttons could each read "pressed", and nothing conveys that they are mutually exclusive.
- **Use native `<fieldset><legend>How confident are you?</legend>` + 5 × `<input type="radio" name="fist">` with visually styled `<label>`s** holding the big hand SVG (`aria-hidden`) plus visible text "1 – No way" … "5 – Fully in". Native radios give arrow-key behaviour, grouping and the "n of 5" count for free.
- Note a native-radio quirk: arrow keys *select* immediately. If a vote is sent on each change, a keyboard user arrowing from 1 to 5 would broadcast 2, 3, 4 along the way. Options: (a) treat the selection as a draft and send it when the user presses a "Submit vote" button, or (b) debounce sending (~600 ms) and make the vote changeable until reveal. (a) is clearer for SR users, and the button gives a natural "Vote submitted" confirmation.
- Alternative if the design must be buttons with an immediate send: a `role="radiogroup"` with `role="radio"` + `aria-checked` + roving tabindex (APG example). That is more code to get right, so prefer native.
- Selected state must not rely on pastel colour alone (1.4.1). Add a check icon or thick border, plus 3:1 contrast for the state indicator (1.4.11).

### Focus map [judgement, following "move focus only on user's own action"]
| Action | Who | Focus goes to | Announcement |
|---|---|---|---|
| Route change (home → activity, join) | self | the new view's `<h1>` (`tabindex="-1"`), and set `document.title` first | none needed (h1 is read); optional polite "Fist of Five" |
| Facilitator clicks **Start vote** | facilitator | the vote panel heading, or keep focus on the now-replaced control's successor ("End/Reveal" button) | polite "Vote started" |
| Vote started by facilitator (remote) | participant | **don't move focus** | polite "Vote started: choose 1 to 5" |
| Submit vote | self | keep focus on the submit button, or the changed-vote control | polite "Vote submitted: 4" |
| Facilitator clicks **Reveal** | facilitator | after the countdown, the "Results" h2 (`tabindex="-1"`) | polite one-line summary |
| Reveal triggered remotely | participant | don't move focus | polite summary + "Results are below" (they can press H) |
| Add Word Cloud entry | self | **back in the input** (cleared) for rapid entry | polite "Added 'deadline'. 3 entries." |
| Delete an entry chip | self | the next chip's delete button. If it was the last chip, the previous one. If none remain, the input | polite "Removed 'deadline'. 2 entries." |
| Invite / copy link | self | stays on the button | see §4 |
| Element holding focus disappears because of a remote update (e.g. phase change removes the picker) | — | move to the nearest stable heading **only if** focus would otherwise fall to `<body>` | polite reason |

- Svelte 5 implementation: `bind:this={h1}` then `tick().then(() => h1.focus())` inside the route change. `tabindex="-1"` on the heading. Suppress the focus ring on programmatically focused headings with `:focus:not(:focus-visible)` if wanted. [judgement]
- `document.title` pattern: "Results – Fist of Five – Team Tools". In SvelteKit use `<svelte:head><title>`. SvelteKit itself resets focus to `<body>` on navigation and has a route announcer. Check whether the app uses SvelteKit, and whether its built-in announcer duplicates the h1 announcement. [src for SvelteKit behaviour: https://svelte.dev/docs/kit/accessibility]

---

## 4. Clipboard copy feedback and dynamic labels

- APG: if a toggle's label changes, don't use `aria-pressed`. More generally, a label changing under focus is not reliably re-announced by every screen reader. [src APG Button; re-announcement behaviour is my understanding, so treat it as judgement]
- Recommended pattern [judgement]:
  - Keep the button's accessible name stable, "Copy invite link", and change only the visible text/icon to "Link copied ✓" for ~2 s. *Also* push a polite status: "Invite link copied to clipboard".
  - Alternatively let the name change, but still fire the status message, which is reliable. Don't rely on the name change alone.
  - On clipboard failure (permissions, insecure context), announce assertive/alert "Couldn't copy. The link is: …" and show a selectable read-only `<input>` with the URL as fallback. Also show the URL as visible text next to the button so it can be shared without the clipboard.
  - Don't make the "copied" state disappear before ~2 s, and don't disable the button.
- 4.1.3 Status Messages covers "copied" confirmations. [src] https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html

---

## 5. Forms: labels, errors, character limits

- Every input has a visible `<label for>`. Placeholders are not labels. Hint text goes through `aria-describedby`. [src] WebAIM forms https://webaim.org/techniques/forms/ ; GOV.UK text input https://design-system.service.gov.uk/components/text-input/
- GOV.UK Character count: the count message sits under the field and is linked via `aria-describedby`. Screen reader users hear the count **when they stop typing** (debounced), not on every keystroke. Don't hard-block with `maxlength`: let users exceed the limit and tell them ("You have 3 characters too many") so they can edit. A threshold option shows the count only near the limit. Known JAWS quirks are listed. [src] https://design-system.service.gov.uk/components/character-count/
- Errors: put the error message in text next to the field, linked with `aria-describedby`, set `aria-invalid="true"` on the field, and move focus to the field (or an error summary) on submit. [src] GOV.UK error message https://design-system.service.gov.uk/components/error-message/ ; WCAG 3.3.1 https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
- App specifics [judgement]:
  - Name field: `autocomplete="nickname"` (or `name`), `spellcheck="false"`. Persist it in localStorage so the user doesn't retype it.
  - Entry field: a `<form>` so Enter submits. A visible label "Add a word or short phrase". A hint "Up to 30 characters" linked via `aria-describedby`. On empty submit, show an inline error and keep focus in the field. Don't disable the Add button: disabled buttons aren't focusable and give no reason why.
  - Duplicate entry: decide on a behaviour, then announce it ("'deadline' is already in your list").
  - Countdown live region for characters: debounce ~1 s, and announce only below a threshold (e.g. ≤ 10 left) or when the limit is exceeded.

---

## 6. Motion, colour contrast, focus, target size

### Motion
- `prefers-reduced-motion: reduce`: remove or replace non-essential motion (confetti, count-up, chip slide-in, hand-circle spin, countdown zoom). Show final states immediately, or use a fade ≤ 200 ms. [src] MDN https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion ; WCAG 2.3.3 (AAA) https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- 2.2.2 Pause, Stop, Hide (A): auto-starting motion lasting more than 5 s needs a way to pause, stop or hide it. Keep confetti under 5 s, or give it a stop. [src] https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- 2.3.1: no flashing more than 3 times per second. Watch confetti colour strobing. [src] https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html
- Also offer an in-app "Reduce motion" toggle that overrides the OS setting (some users don't know about the OS setting). [judgement]
- Haptics (`navigator.vibrate`): purely supplementary, never the only feedback, and switched off with reduced motion or a setting. Note that iOS Safari doesn't support the Vibration API. [judgement; MDN https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate]

### Contrast (pastel on warm off-white)
- Body text and labels need **4.5:1**. Large text (≥ 24 px regular, or ≥ 18.66 px bold) needs **3:1**. [src] 1.4.3 https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- UI component boundaries and states (input borders, button outlines when they're the only affordance, selected-state indicator, chart bars against the background, chip borders) need **3:1** against adjacent colours. [src] 1.4.11 https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Pastels almost always **fail 3:1 against off-white**. [judgement, from typical pastel luminance] Rules:
  - Use pastels as *fills* and put dark text on them (check text on the pastel at 4.5:1). Give each pastel component a darker same-hue border or outline at ≥ 3:1 against the background.
  - Bars: a pastel fill plus a dark stroke, or rely on the adjacent data table and direct labels. The table alternative also helps 1.4.11 (graphics whose information is available in text are exempt from some requirements per the Understanding doc, but don't lean on that).
  - Selected state must not be colour-only (1.4.1). Add a check icon, bold border, or "Selected" text.
  - Word cloud word colours: each word's text must be 4.5:1 (or 3:1 if large) against the background. Most cloud words are large, but small ones are not.
  - Test both light and dark themes, if dark exists.
- Tools: WebAIM Contrast Checker https://webaim.org/resources/contrastchecker/ ; APCA is informative only and not normative for WCAG 2.2. [judgement]

### Focus indicators
- 2.4.7 (AA): focus must be visible. 2.4.11 (AA): a focused component must not be *entirely* hidden by author content such as a sticky header, toast or cookie bar. [src links above]
- 2.4.13 (AAA, cheap to meet): the indicator area must be at least a 2 CSS px perimeter of the component, with ≥ 3:1 contrast between focused and unfocused pixels. [src]
- Recipe [judgement]: `:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }` where `--focus` is dark (e.g. near-black or deep blue) with ≥ 3:1 against both the off-white background *and* pastel fills. Never `outline: none` without a replacement. Use `scroll-margin-top`/`scroll-padding-top` so sticky headers don't cover focus (2.4.11).
- Windows High Contrast / forced-colors: outlines survive, but box-shadow focus rings disappear, so prefer `outline`. Test `@media (forced-colors: active)` and make sure the SVG hands use `currentColor`. [src] MDN forced-colors https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors

### Target size
- 2.5.8 (AA): **24×24 CSS px** minimum, or enough spacing that a 24 px circle centred on each target doesn't overlap another target. Exceptions: equivalent control, inline text, UA default, essential. [src] https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Aim for **44×44** (2.5.5 AAA) on touch. The chip delete "×" buttons are the main risk: make them ≥ 24 px (ideally 44) and give each a name, `aria-label="Remove 'deadline'"`. [judgement + 2.5.5 https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html]

---

## 7. Other component notes [judgement unless cited]
- **Home activity cards as buttons:** use a real `<button>` (or `<a>` if it navigates to a URL; navigation means a link). The accessible name is the card title. Put the description in `aria-describedby`, or let the whole card text be the name if short. Don't nest interactive elements inside.
- **Presence chips:** a `<ul aria-label="People in the room (7)">` with `<li>`s, not a live region itself. Announcements come from the coalesced announcer. Answered state as text: "Alice, answered" (visually-hidden "answered" beside the check icon, which is `aria-hidden`).
- **Facilitator vs participant:** expose role in text ("You are the facilitator").
- **Language:** `<html lang="…">` matches the UI language. If user-entered words are in another language, there's nothing practical to do.
- **Connection state (WebRTC):** announce disconnect/reconnect politely, and use assertive only if actions will be lost.
- **Svelte compiler a11y warnings** cover many basics (missing alt, click on non-interactive elements, label association, positive tabindex, redundant roles, autofocus, etc.). Suppress them only with `<!-- svelte-ignore code (reason) -->`. [src] https://svelte.dev/docs/svelte/compiler-warnings

---

## 8. Testing and CI

### Automated layers
1. **Svelte compiler warnings / svelte-check**: `svelte-check --fail-on-warnings` in CI makes every `a11y_*` warning fail the build. [src: svelte-check CLI https://svelte.dev/docs/cli/sv-check ; warnings list https://svelte.dev/docs/svelte/compiler-warnings]
2. **eslint-plugin-svelte**: it has no dedicated a11y rule set. `svelte/valid-compile` reports compiler warnings (including a11y) as lint errors, and `svelte/button-has-type` is useful. [src] https://sveltejs.github.io/eslint-plugin-svelte/rules/ . Running both 1 and 2 is redundant. Pick svelte-check for a11y, plus ESLint for the rest. [judgement]
3. **Component tests: Vitest + @testing-library/svelte + axe**:
   - `vitest-axe` (fork of jest-axe): `import 'vitest-axe/extend-expect'`, then `expect(await axe(container)).toHaveNoViolations()`. **Does not work with `happy-dom`. Use `jsdom`.** [src] https://github.com/chaance/vitest-axe
   - jsdom has no layout, so axe's `color-contrast` checks can't run meaningfully there. Rely on Playwright for contrast. [judgement / known jsdom limitation; jest-axe README notes color-contrast is unreliable in jsdom https://github.com/NickColley/jest-axe]
   - Using Testing Library's `getByRole('radio', { name: '4 – Mostly yes' })` *is* an a11y test. Query by role and name everywhere. Test focus explicitly: `expect(document.activeElement).toBe(getByRole('heading',{name:'Results'}))`. Test announcer output: `expect(getByRole('status')).toHaveTextContent('3 people joined')` (use fake timers for the coalescing). [judgement; Testing Library query priority https://testing-library.com/docs/queries/about#priority]
   - Optional: Vitest browser mode (Playwright provider) runs component tests in a real browser, where contrast checks work. [judgement]
4. **E2E: Playwright + @axe-core/playwright**: run `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze()` *in each UI state* (home, joined, voting, after reveal, word-cloud reveal, reduced-motion emulated via `page.emulateMedia({ reducedMotion: 'reduce' })`, dark mode). A shared fixture keeps the config in one place. Scans reflect only the current DOM, so wait for animations to settle. Snapshot fingerprints (rule ID plus target), not raw violations. [src] https://playwright.dev/docs/accessibility-testing
   - Multi-peer flows: open two browser contexts in one test (facilitator plus participant) and assert on the participant's `role=status` text after the facilitator acts. [judgement]
   - Playwright `toMatchAriaSnapshot()` locks down the accessibility-tree shape of the results figure/table and the picker, catching role and name regressions. [src] https://playwright.dev/docs/aria-snapshots
   - Keyboard-only test: drive the whole Fist of Five flow with `page.keyboard` (Tab, arrows, Space, Enter) and no mouse. [judgement]
5. Automated tools catch only a subset of issues, so manual testing remains essential. [src] Playwright docs above; Deque says axe finds ~57% of issues by volume https://www.deque.com/automated-accessibility-coverage-report/

### Manual screen-reader script (run before each release, ~15 min) [judgement]
Setups: **VoiceOver + Safari (macOS)**, **VoiceOver + Safari (iOS)**, **NVDA + Firefox or Chrome (Windows)**. Ideally the blind teammate's own setup (likely JAWS or NVDA + Chrome) is the primary one. Ask them.

1. **Load home.** Is the title announced? Navigate by headings (VO: VO+Cmd+H / rotor; NVDA: H). Is there one h1? Name field: label and hint read? Activity cards: read as buttons/links with clear names?
2. **Create a Fist of Five session.** Focus lands on the h1, and the new title is read.
3. **Invite.** Activate it: "Invite link copied to clipboard" is announced once, and focus stays on the button.
4. **Joins.** In a second browser, join 3–4 fake participants quickly. Is the result *one* summary announcement, not four? Does typing elsewhere get interrupted? (It shouldn't.)
5. **Start vote (as participant).** "Vote started" is announced without a focus jump. Navigate to the picker: "radio, 1 of 5" plus the group legend. Arrow keys behave sensibly, and submit is confirmed.
6. **As facilitator:** progress "4 of 7 have voted" arrives in batches. The chips list reads "Alice, answered".
7. **Reveal.** One countdown message, not three. A results summary is announced. Facilitator focus is on the Results heading. Table navigation works (VO: VO+arrows in table; NVDA: Ctrl+Alt+arrows). The hand circle is not read as SVG junk.
8. **Word Cloud.** Add an entry with Enter: focus returns to the input, and "Added …" is announced. Exceed the length: the limit message is read after a pause. Delete a chip: the name includes the word, and focus moves to a sensible neighbour.
9. **Word cloud reveal.** The list of words with counts is reachable. Confirm the SVG is silent.
10. **Settings.** Enable OS reduced motion: no confetti, no count-up, no countdown animation. Zoom to 200% and 400% width (1.4.10 reflow): no loss of content. Use Windows High Contrast / forced colors: focus and selection still visible.
11. **iOS VO:** swipe through the picker, double-tap to select, and check rotor headings. Is haptics misleading? Do target sizes work?

Helpful tools: NerdeRegion (logs live-region announcements, https://chromewebstore.google.com/ search "NerdeRegion"), the NVDA Speech Viewer, the VoiceOver caption panel, Accessibility Insights for Web (guided manual checks, https://accessibilityinsights.io/).

---

## Source list
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Understanding 2.4.11 / 2.4.13 / 2.5.8 / 4.1.3 (URLs inline)
- APG Button: https://www.w3.org/WAI/ARIA/apg/patterns/button/
- APG Radio: https://www.w3.org/WAI/ARIA/apg/patterns/radio/
- WAI complex images: https://www.w3.org/WAI/tutorials/images/complex/
- Scott O'Hara, Are we live?: https://www.scottohara.me/blog/2022/02/05/are-we-live.html
- Sara Soueidan, live regions part 1/2: https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/ , https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-2/
- Léonie Watson, accessible SVG line graphs: https://tink.uk/accessible-svg-line-graphs/
- Adrian Roselli, switch/toggle: https://adrianroselli.com/2021/10/switch-role-support.html
- Marcy Sutton / Gatsby routing user testing: https://www.gatsbyjs.com/blog/2019-07-11-user-testing-accessible-client-routing/
- GOV.UK character count: https://design-system.service.gov.uk/components/character-count/
- Svelte compiler warnings: https://svelte.dev/docs/svelte/compiler-warnings ; SvelteKit a11y: https://svelte.dev/docs/kit/accessibility
- eslint-plugin-svelte rules: https://sveltejs.github.io/eslint-plugin-svelte/rules/
- vitest-axe: https://github.com/chaance/vitest-axe
- Playwright a11y testing: https://playwright.dev/docs/accessibility-testing

Note: the following URLs are cited from prior knowledge and were not re-fetched in this session: Deque SVG article, WebAIM forms/contrast checker, GOV.UK error-message, MDN pages, the ariaNotify explainer, Playwright aria-snapshots, Deque coverage report, SvelteKit a11y doc, jest-axe README.
