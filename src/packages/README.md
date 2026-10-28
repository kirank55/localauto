# Packages

Each folder under `src/packages/` is a deep module: a small public surface with the behaviour behind it.

```
src/packages/<name>/
  index.ts        entry point
  hosts.ts        another entry point, when the surface is a different job
  lib/            implementation, private to the package
  tests/          tests that import entry points only
```

Import a package through its root files. Do not import `lib/` or `tests/` from outside the package, and do not re-export a whole subtree through one barrel. Add another root file when a caller needs a second, smaller entry point.

`npm run lint:boundaries` enforces that. The four rules:

- App code may import only a package's entry points.
- A package may reach another package only through entry points.
- Tests import entry points and their own `tests/` fixtures, not internals.
- No dependency cycles.
