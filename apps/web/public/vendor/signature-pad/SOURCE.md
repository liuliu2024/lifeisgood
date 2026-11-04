# Signature Pad — DAILY-042

Reviewed 2026-11-04. A Chinese browser-local handwriting wrapper around **signature_pad 5.1.3**; no identity verification, document signing or legal electronic seal service.

- Upstream: https://github.com/szimek/signature_pad
- Tag v5.1.3 and npm gitHead: `b392d1d417a7a2fa21a7f659eb76fddcc2be3fdb`.
- Exact package: https://registry.npmjs.org/signature_pad/-/signature_pad-5.1.3.tgz
- Download command `npm pack signature_pad@5.1.3 --ignore-scripts --pack-destination apps/web/.cache/signature-pad-audit`. No install or lifecycle/build script executed; no main package/lock changes.
- Actual archive SHA512 base64 independently computed and matched registry: `zyxW5vuJVnQdGcU+kAj9FYl7WaAunY3kA5S7mPg0xJiujL9+sPAWfSQHS5tXaJXDUa4FuZeKhfdCDQ6K3wfkpQ==`.
- `signature_pad.umd.min.js` is a byte-for-byte copy of published `dist/signature_pad.umd.min.js`, SHA256 `0d8abbc3ba7c963b80edca55d1aed04383b6194e9ab521ca977a832f9b0dc5c4`.
- Actual complete MIT license read and retained as LICENSE.txt (Copyright2018 Szymon Nowak), SHA256 `7d461320b6c69581bd19cc9402aa9a5e33ad826ed2f977d03bcb884e0cc6ce54`.
- Actual README/package scripts/source read. No declared production dependencies; UMD self-contained. No images/fonts/CDN/API/remote fetch needed. Source scan found no fetch/XMLHttpRequest/eval/new Function. The library's `fromDataURL` could load images, but wrapper never calls or exposes it and accepts no imported SVG/HTML/URL data.
- Build script runs lint/clean/esbuild/type emission/copy docs; prepublishOnly runs build; start builds/serves docs, test runs Jest coverage. Development-only dependencies include esbuild, tslib, TypeScript, ESLint, Jest, serve and semantic-release plugins. None installed or executed here. No install/postinstall scripts.
- Read coordinate/event/clear/off/fromData/toSVG implementation. Raw points are relative to CSS bounds; wrapper retains completed strokes in canonical1000×500 coordinates, redraws input on resize and exports from a separate fixed-size pad. SVG root width/height/viewBox explicitly normalized so devicePixelRatio cannot change export size. SVG output only path/circle and optional white rect, never external href or event input.
- Bounds:100 strokes,500 points/stroke,5000 total, fixed1000×500 PNG/SVG, fixed dark pen and transparent/white background. Excess current stroke is cancelled; finished strokes remain. Editing/drawing/undo/background changes revoke old downloads; async outputs have cancellation and8sec timeout. Load failure/8sec timeout offers Chinese retry.

Audit archive, raw README/package/source and maps stay in ignored `.cache/signature-pad-audit`, not public assets. Actual output evidence and known limits: `docs/tasks/DAILY_SIGNATURE.md`. Touch/pen simulation in desktop Edge is not real phone testing; no legal or printing claims.
