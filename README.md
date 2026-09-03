# Maint Tool

Aircraft maintenance dispatch helper for date and time calculations.

Computes due dates from a 23:59 cutoff (MEL A/B/C/D, MOI, NEF) across ~40
timezones, plus unit and duration arithmetic on the A/C Time tab. Installable as
a PWA and usable offline once loaded.

## Development

```bash
npm install      # once per machine
npm run verify   # JSX syntax check + tests — run this before every commit
```

| Command | What it does |
| --- | --- |
| `npm run verify` | The gate. JSX syntax check plus the full test suite. |
| `npm test` | Tests only. Honours `TZ=` so you can reproduce timezone bugs. |
| `npm run icons` | Regenerates the PNG icons from the SVG sources (needs Playwright). |

There is no build step: `index.html` is served as-is and Babel compiles the JSX
in the browser. Pure calculation logic lives in `lib/core.js` so it can be unit
tested under Node.

Agents and contributors: read [`AGENTS.md`](./AGENTS.md) before making changes.

## Hosting

A static site served from the repository root.

- Build command: none
- Publish directory: repository root
- Pages source: `main` branch, `/ (root)`

The manifest and service worker use relative paths, so it works from a GitHub
Pages project URL such as `/maint-tool/`. `netlify.toml` is kept for the
alternate host — its cache headers have no effect on GitHub Pages.

If a deploy does not appear, the cause is browser or service worker caching, not
a missing commit. Hard-reload, or unregister the service worker in DevTools.
