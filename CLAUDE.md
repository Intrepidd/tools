## Accessibility (hard requirement)

A teammate is blind and uses a screen reader. Every feature and change must stay fully accessible by screen reader and keyboard (WCAG 2.2 AA minimum). Follow `docs/accessibility.md` on every change, add or update its a11y tests, keep `npm run check` and `npm test` green, include accessibility in every spec, ticket and code review, and say plainly what was not checked with a real screen reader.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `Intrepidd/tools` (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
