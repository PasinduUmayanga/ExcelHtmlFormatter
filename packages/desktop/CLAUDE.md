# packages/desktop — local rules (security-sensitive)

- This is the trust boundary between the window and the file system. Read `docs/security.md` before changing it.
- Every IPC handler validates its arguments (`typeof` checks, `validateConfig`, the `pickedFiles` allow-list) and never
  trusts paths or settings sent by the window.
- Keep `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, the CSP, and the navigation/window-open
  guards. Never expose `ipcRenderer` or Node APIs to the window directly.
- `src/preload` may only import `electron` at runtime (type imports from `@hf/core` are fine) — it runs sandboxed.
- No format-specific code: formats are injected (`startDesktopApp({ format, createWorker })`, `runWorker(adapter)`).
- New or changed IPC channels: update `ElectronApi` in `@hf/core`, the preload, `docs/api/contracts.md`, and add tests.
