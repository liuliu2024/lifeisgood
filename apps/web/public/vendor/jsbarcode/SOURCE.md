# JsBarcode provenance — DAILY-038

Reviewed 2026-11-04. This is a Chinese browser-local wrapper for the library, not the entire upstream application.

- Upstream: https://github.com/lindell/JsBarcode
- Release: 3.12.1, tag v3.12.1 dereferenced commit `6b7622c221efd54212edb2a5a77ce58f5825dec4` (annotated tag object `8f9e0e080a730fc8096f71399edcda5e15e07df0`). npm registry gitHead matches.
- Exact artifact: https://registry.npmjs.org/jsbarcode/-/jsbarcode-3.12.1.tgz
- Archive SHA512 base64 verified: `QZQSqIknC2Rr/YOUyOkCBqsoiBAOTYK+7yNN3JsqfoUtJtkazxNw1dmPpxuv7VVvqW13kA3/mKiLq+s/e3o9hQ==`.
- Browser file copied byte-for-byte from `package/dist/JsBarcode.all.min.js`. No upstream scripts run, no install or build performed. Archive unpacked as data only; archive and unused files removed from public assets.
- MIT original retained in MIT-LICENSE.txt; original README and package metadata retained alongside it. Actual license read, not inferred from GitHub metadata. No separate runtime assets/fonts or production dependencies in package.json; browser bundle is self-contained. Optional jQuery is unused. Build/test devDependencies include gulp, Babel, webpack, canvas, xmldom, request and coverage tooling; none installed or run. Scripts reviewed: test invokes gulp/mocha, build invokes gulp compile, coverage/coveralls invoke reporting tools. No install/preinstall/postinstall scripts.
- Reviewed SVG renderer uses createElementNS/createTextNode, fixed rectangle/text drawing, no input HTML interpolation. EAN13 source adds/checks the standard mod10 digit. Bundle scan found URL strings in comments/namespace only, no fetch/XMLHttpRequest/eval calls. Wrapper exposes only CODE128 printable ASCII and EAN13, fixed black/white colors, integer sizes and bounded output. No CDN, workers, API or uploads.

SHA256 (raw upstream bytes):

| File | SHA256 |
| --- | --- |
| JsBarcode.all.min.js | 9c6d079b69a763191e38de8f3d69a252cb2413ea8f35af15478a5a870c7edfa2 |
| MIT-LICENSE.txt | e34674e4ef4ed987f7a21a3040a1bdce83f08cc07eedfacbba1ffe53b0633734 |
| package.upstream.json | ae038c9ed77976c5a49a8782a2c6a3f2a72449215fef98a3644c7827836d3189 |
| README.upstream.md | 4acd336a181e8a572b91e4405f188f5e1dab09dbae9c53e2323d63679c57da0b |

PNG independent decoding acceptance uses ZXing-C++2.3.0 outside application dependencies. It is not shipped as a second tool. See docs/tasks/DAILY_BARCODE.md for verification evidence and limits. Real device scanning and printing remain unverified.
