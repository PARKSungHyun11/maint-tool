# Maint Tool

Offline-first aircraft maintenance dispatch utility for iOS, Android, and the
web. The app provides maintenance due-date calculations, UTC/local time views,
time and length arithmetic, fuel-density conversion, and supporting workflow
tools in a React/Capacitor shell.

## Development

```bash
pnpm install
pnpm run dev
pnpm run verify
```

`pnpm run verify` builds the production web bundle and runs the Node regression
suite. Pure date/timezone/unit logic lives in `lib/core.js`; contributors and AI
agents should read [`AGENTS.md`](./AGENTS.md) before changing it.

Native refresh commands:

```bash
pnpm run sync
pnpm run open:ios
pnpm run open:android
```

## Web hosting

`pnpm run build` creates `dist/`. Relative manifest and service-worker paths
allow deployment below a project subpath such as `/maint-tool/`.
