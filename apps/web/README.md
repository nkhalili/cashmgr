# Cash Mgr. Web App

React + Vite + TypeScript web application for Cash Mgr.

## Development

```bash
pnpm dev
```

Runs on <http://localhost:3000>

## Building

```bash
pnpm build
```

Output in `dist/` directory.

## Features

- Dashboard with balance overview
- Transaction management
- Account management
- Category management
- Settings

## Database

Uses `@sqlite.org/sqlite-wasm` + OPFS (Origin Private File System) for local SQLite storage via a Web Worker (Comlink). Falls back to the legacy sql.js + IndexedDB adapter on browsers without OPFS support (e.g. iOS < 17).
