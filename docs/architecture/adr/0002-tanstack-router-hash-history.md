# 0002. TanStack Router with hash history

- Status: Accepted
- Date: 2026-11-09

## Context

The UI first tracked the current screen in the state store (`screen: 'analysis'`), with hand-written `canGo` and
`returnTo` logic. With screens shared by several apps, that logic would be duplicated and hard to test. The packaged app
loads its page from a `file://` address.

## Decision

Use TanStack Router (code-based route tree, built by `createFormatterRouter()` in `@hf/ui`) with **hash history**
(`#/open`, `#/analysis/Products`). Route guards (`beforeLoad`) replace `canGo`; `?tag=`/`?back=` replace `returnTo`.
Search params are validated in `validateSearch`, which must return **every key** (TanStack keeps the raw value of any
key that's left out). The store keeps data only (document, selection, settings, jobs); the router owns "where you are".

## Consequences

- Route params and search params are type-checked at compile time across packages (`Register` declaration).
- Back/forward work; "Done, back to …" is plain navigation.
- Router tests need a DOM (happy-dom); without one the router switches to server-rendering mode.
- A reload loses the open document (it lives in memory), so guards send the user to `#/open`. This is intended.

## Alternatives considered

- **React Router 8.5:** also supports hash routing; less strict typing of params/search.
- **Browser history:** breaks on reload under `file://`.
- **Keep store-based navigation:** no deep links, no back/forward, duplicated guard logic.
