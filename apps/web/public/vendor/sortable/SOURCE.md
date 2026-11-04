# SortableJS local task-board source

- Repository: https://github.com/SortableJS/Sortable
- Fixed version: `sortablejs@1.15.6`.
- npm gitHead / reviewed GitHub commit: `63ecb31937d19fcb30aa924e82ee8a769ef34492`.
- Registry archive: https://registry.npmjs.org/sortablejs/-/sortablejs-1.15.6.tgz
- Archive SHA-1 verified: `ff93699493f5b8ab8d828f933227b4988df1d393`.
- Original `Sortable.min.js` SHA-256: `6d0a831fc19b4bae851797ad3393157e861afb7862459c11226359b27e2c4337` (45,092 bytes; unchanged).
- GitHub contents at the fixed commit were read on 2026-11-04: browser bundle byte-identical to npm; LICENSE differs only CRLF/LF; parsed package.json is identical. Initial connector request failed, subsequent official GitHub API reads succeeded. A failed request is not counted as verification.
- LICENSE SHA-256: `e94dfc31e800d169257569db270457c9f028440c9ccae41e7eb78b2db18f1298` (original npm bytes retained).

## Runtime / license closure

The original browser UMD includes Sortable and its bundled optional plugins; the package declares no runtime dependencies. The shipped bundle has no external imports, remote assets or fetch/XHR/WebSocket calls. Platform only enables normal single-card drag/sort; no multi-select or swap UI is advertised. References to optional existing jQuery/Polymer globals in upstream cloning helpers do not load or ship those libraries.

Original MIT Copyright 2019 All contributors to Sortable is retained in LICENSE. The transpiled bundle also includes Babel helper functions. `BABEL_HELPERS_LICENSE` is the original MIT notice from official `@babel/helpers@7.26.0` npm package, Copyright 2014-present Sebastian McKenzie and other contributors (SHA-256 `117da2af0d4ce0fe1c8e19b5cff9dcd806adf973d328d27b11d4448c4ff24f76`). It is an attribution source for the Babel helper code, **not a claim that version 7.26.0 built this Sortable bundle**: package devDependencies declare Babel `^7.4.4`; the exact historical helper build version is not locked by this artifact. No Babel executable or auxiliary package is shipped.

Downloads used `npm pack --ignore-scripts` only. Declared build/test/watch scripts were read, not executed; none of the upstream development tools were installed. The platform's Chinese UI is original local code; it is not the whole upstream application.

## Delivered scope

Three temporary columns, up to 50 single-line cards of 1–120 UTF-16 code units, actual Sortable drag handles plus button-based movement, deletion and JSON/TXT exports. State stays in the page and is lost on refresh/leave; no persistence, import, accounts or cloud collaboration. React's DOM is restored before accepting Sortable's final order into React state. Export limits are 128 KiB; edits revoke old export URLs. Source code uses no arbitrary HTML, user script, server upload, analytics, external fonts or API. Browser/mobile simulation does not prove every real touch device or assistive technology.

Stars: 31,208 / last repository push 2026-03-24, read 2026-11-04 (research snapshot, not an application quality score).
