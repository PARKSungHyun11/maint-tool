# Working on maint-tool

This repository is worked on by more than one AI agent (Codex and Claude) plus
its owner. This file is the shared contract. It is the single source of truth —
`CLAUDE.md` points here rather than repeating it.

## What this app is

A single-page aircraft maintenance dispatch calculator. It computes **due dates**
from a 23:59 cutoff (MEL categories A/B/C/D, MOI, NEF) across ~40 timezones, and
does unit and duration arithmetic on the A/C Time tab.

The thing that matters most: **a due date that is wrong by one day is worse than
an app that does not load.** Correctness of date maths outranks everything else
in this repo.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The whole UI. React + JSX, compiled in the browser by Babel standalone. No build step. |
| `lib/core.js` | All pure date / timezone / unit maths. Runs in the browser and under Node. |
| `tests/` | Dependency-free test suite. `node tests/run.js`. |
| `tools/` | `build-icons.js` (SVG → PNG), `check-jsx.js` (parses the JSX in index.html). |
| `icon*.svg` | Icon **sources**. Edit these. |
| `icon-*.png` | **Generated.** Never hand-edit, never copy one size over another. |
| `sw.js`, `manifest.json` | PWA plumbing. |

## The one command

```bash
npm run verify
```

Runs the JSX syntax check and the full test suite. **Green before every commit,
no exceptions.** There is no build step and no type checker, so this is the only
thing standing between a typo and a blank white screen on someone's phone.

First time on a machine: `npm install` (only TypeScript is required; Playwright
is optional and only needed to regenerate icons).

## Rules

1. **Calculation logic goes in `lib/core.js`, not `index.html`.** If it can be
   wrong, it must be reachable from Node so a test can pin it down. `index.html`
   binds the core's exports at the top; add to that list when you export
   something new. `lib/core.js` must not touch `document`, `window`,
   `localStorage`, or React — a test enforces this.

2. **Every bug fix ships with a regression test.** Write the test so it fails
   against the old behaviour first. The DST cases in `tests/core.test.js` are the
   model: they name the zone, the date and the expected wall-clock result.

3. **PNG icons are generated artefacts.** Edit `icon.svg` or
   `icon-maskable.svg`, then run `npm run icons`. Do not hand-edit a PNG and do
   not copy one size to another — `icon-512.png` was once a byte-for-byte copy of
   the 192px file, and the manifest advertised a resolution that did not exist.
   A test now compares declared `sizes` against the real IHDR dimensions.

4. **No empty "trigger deployment" commits.** GitHub Pages redeploys on any push
   to `main`; if a change is not showing up the cause is browser or service
   worker caching, not a missing commit. The history already carries half a dozen
   of these and they make the log unreadable.

5. **Do not add a build step or move hosting without saying so in the PR.** The
   no-build-step design is deliberate: the owner edits and deploys from a phone.
   If you do add one, `npm run verify` has to keep working unchanged.

6. **Ask before changing a maintenance interval.** A/B/C/D, MOI and NEF day
   counts encode a real-world rule. They are not tuning knobs.

## Things that have already bitten this repo

Read these before touching the relevant area.

- **DST and due dates.** Adding `days * 24h` to an instant drifts by an hour
  across a spring-forward transition, turning a 23:59 cutoff into 00:59 and
  reporting the due date a full day late. `calcDuePair` therefore adds the
  interval on the *calendar of the target zone*, via `zonedDateToUtc`. Never go
  back to `setUTCDate` on a local-zone instant. Korea has no DST, so this class
  of bug is invisible when testing from KST — that is why the suite pins
  Toronto, Paris, London, Sydney and Santiago.

- **`customTz` is a mode flag, not a zone id.** `"UTC"` means the custom date was
  entered as a UTC date; anything else means it was entered in `localZone`. In
  custom mode only one of the two result rows is rendered, so `calcDuePair`
  returns the same instant in both fields on purpose.

- **NEF and 29 February.** A 29 FEB base rolls to 01 MAR two years later. This is
  the original behaviour, kept deliberately and pinned by a test. Changing it is
  a maintenance-rule decision, not a code cleanup.

- **iOS ignores an SVG `apple-touch-icon`.** It must be a PNG or Safari falls
  back to a screenshot of the page. This is why `icon-180.png` exists.

- **Maskable icons get cropped to a circle.** Only art drawn inside the centre
  80% safe zone may claim `purpose: "maskable"` — hence the separate
  `icon-maskable.svg`. The original icon had "TIMER" at 82% down the canvas and
  lost its bottom edge on Android.

- **The CDN is a single point of failure.** React, ReactDOM and Babel come from
  unpkg. If any of them fails the page renders nothing at all, so `index.html`
  carries a `#cdn-fallback` card that appears instead of a blank screen. Keep it
  working if you touch the script tags.

- **`caches.addAll` in `sw.js` rejects as a unit.** One missing file in `STATIC`
  and the service worker never installs. A test checks every entry exists.

- **`netlify.toml` headers do nothing on GitHub Pages.** The repo is deployed
  from `main` at the repository root. The Netlify config is kept for the
  alternate host; don't rely on its cache headers.

## Handing work between agents

- Branch from `main`. One branch per piece of work, pushed to `origin`.
- Open a draft PR and describe what you verified, not just what you changed.
- Leave `npm run verify` green on the branch tip. If you must stop mid-way, say
  so explicitly in the PR body and leave the failing test in place rather than
  deleting it.
- Do not rewrite history on a branch another agent or the owner may have checked
  out. Merge `main` in; don't rebase someone else's branch.
- If you disagree with something in this file, change the file in the same PR
  and say why. Silent divergence is the failure mode to avoid.
