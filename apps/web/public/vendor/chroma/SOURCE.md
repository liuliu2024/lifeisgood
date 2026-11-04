# chroma.js browser artifact provenance

Read/pinned 2026-11-04 (Asia/Shanghai).

- Upstream: https://github.com/gka/chroma.js
- Tag: v3.2.0
- Tag commit, read via GitHub refs API: `91eee6285b2e890c423f2fccfd6c7ed3c3ec6dc0`
- Package: `chroma-js@3.2.0`, https://registry.npmjs.org/chroma-js/-/chroma-js-3.2.0.tgz
- Archive SHA256: `9C9088F9E370883CBE47C534F7A6CF5FE4D9C99F0C4C5F03EDD692774C49F57A`
- Shipped `chroma.min.js` is byte-for-byte package `dist/chroma.min.cjs` (UMD includes browser global); no modification or rebuild.
- Browser artifact SHA256: `8EE0A44BDD439F7685EECF38A4CAAE80F6415BE1073627E07E07DD87CD352425`
- GitHub web rounded Star display at read: 10.6k; popularity snapshot, not a quality score.

Acquisition: `npm view chroma-js version dist.tarball gitHead scripts dependencies --json`, then `npm pack chroma-js@3.2.0 --ignore-scripts`. No package.json/lock changes, no npm install, no upstream scripts executed. Only selected archive entries extracted. Package has no runtime dependencies; listed development dependencies were not installed. Reviewed package.json, readme.md, LICENSE and distributed UMD header. Runtime has no required network/worker/CDN assets. Browser requests verified separately in test evidence.

## License

Package license is `(BSD-3-Clause AND Apache-2.0)`, not BSD alone. Retain `LICENSE` (upstream full text, including ColorBrewer Apache attribution and X11 named-colour note) and `APACHE-2.0.txt` (full Apache text from https://www.apache.org/licenses/LICENSE-2.0.txt). `package/package.json` and `package/readme.md` retained as source metadata; dist header also preserves notice. BSD conditions include keeping notice/disclaimer and no Gregor Aisch endorsement. No claim of affiliation. No external fonts/images/models shipped for this tool. This review concerns this pinned artifact, not all future library releases.

## Wrapper boundary

Our `/tools/gradient/` is a Chinese browser-local gradient/color-scale wrapper using chroma.scale. It is one distinct upstream project, not a complete installed design application. Lab/RGB/LCH sampling creates 2–16 HEX stops; actual CSS and PNG use the same stops with RGB interpolation between stops. PNG is 1200×480. No AI API, upload or provider credentials. Print colour accuracy and universal browser/device compatibility are not claimed.
