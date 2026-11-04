# Viewer.js local browser artifact

- Upstream: https://github.com/fengyuanchen/viewerjs
- Fixed version: 1.11.7; tag commit 45c9c55f084a7f40de9afa3159f2dc4c50eb5bb2. Original minified JS and CSS banners retained.
- MIT; original LICENSE.txt retained. package.json declares no runtime dependencies. CSS embeds its own icon sprite; no external asset host is used.
- Read package scripts (prepare: husky install, development/build commands); downloaded committed dist files directly, no installation/build scripts executed.
- Chinese gallery wrapper is self-written. Uses inline viewer, own Chinese controls, selected local JPG/PNG only, no remote URLs, upload, AI or payment.
- Scope: preview up to12 local images, zoom/pan/90-degree rotate; rotation download redraws the selected original into PNG. Preview zoom/pan do not crop the export. All files max30MiB combined,10MiB each,16MP each and32MP combined; dimension headers checked before browser decode.
- Stars read 2026-11-04: 8245; pushed_at 2026-10-16. These are source metadata, not a guarantee of quality.
- Hashes recorded by root after saving actual artifacts. Functional acceptance recorded separately.

- Saved JS SHA256: 0915250c13a8defa1b35c3b557e152390a22e30006f0d3e5aa6661c3455e911f.
- Saved CSS SHA256: 4219327e309d4e00eeaed8a0f78098b560316c6525a615d818429b752191b6fa.
