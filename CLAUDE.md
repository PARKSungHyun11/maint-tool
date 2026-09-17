# Claude Code notes

Read [`AGENTS.md`](./AGENTS.md) first. It is the shared contract for Claude,
Codex, and the owner.

Quick gate:

```bash
pnpm install
pnpm run verify
```

Two easy-to-miss constraints:

- Date intervals for a selected timezone must be applied on that timezone's
  calendar so DST cannot move a 23:59 deadline to the following date.
- This is the React/Capacitor application. Do not restore the historical
  single-file CDN/Babel architecture when resolving branches or conflicts.
