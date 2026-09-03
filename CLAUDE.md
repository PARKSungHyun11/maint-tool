# CLAUDE.md

Read [`AGENTS.md`](./AGENTS.md) first — it is the shared contract for everyone
working on this repository, human or agent, and it is the single source of
truth. Do not duplicate its rules here; edit it instead.

Quick reference:

```bash
npm install      # once per machine (TypeScript; Playwright is optional)
npm run verify   # JSX syntax check + full test suite — green before every commit
npm run icons    # regenerate the PNG icons from the SVG sources
```

Two things worth repeating because they are easy to get wrong from a Korean
timezone:

- **Never add `days * 24h` to an instant to get a due date.** Korea has no DST,
  so the resulting one-day error is invisible from KST. Add the interval on the
  target zone's calendar via `zonedDateToUtc`, as `calcDuePair` does.
- **`icon-*.png` files are generated.** Change the SVG and run `npm run icons`.
