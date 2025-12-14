Monorepo with two packages: `ui` (Vite + React + TypeScript) and `server` (Node + TypeScript).

Quick start

1. Install dependencies for both packages (from repo root):

```bash
npm install
```

2. UI dev server:

```bash
npm --workspace ui run dev
```

3. Server dev:

```bash
npm --workspace server run dev
```

Running the Playwright test with Vitest

- The sample Playwright test in `ui/src/App.test.ts` expects the UI dev server to be running at `http://localhost:5173`.
- Install Playwright browsers after installing deps:

```bash
npx playwright install
```

- Run Vitest:

```bash
npm --workspace ui run test
```

Notes

- The `ui` package uses Vitest and a sample Playwright-driven test that launches Chromium. You can adapt tests to use the Playwright fixtures or the `vitest-playwright` plugin if you prefer an integrated fixture approach.
- The server is intentionally minimal and dependency-free (uses the built-in `http` module).
