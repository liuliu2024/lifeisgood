# TinyColor browser artifact

- Repository: https://github.com/bgrins/TinyColor
- Version: 1.6.0; tag resolved through GitHub commit API to `a93228a6782bfe9a6154da14f5a7ece3ad9fb6c4` (2023-02-03).
- Original browser artifact: `dist/tinycolor-min.js`, 15,387 bytes; GitHub text content preserved without adding a banner or trailing newline. This upstream minified file has no license banner; original full MIT license is retained alongside it in LICENSE.txt.
- SHA256: `ca540a4921c5fcec6b2d574616b45c2554d5ab2b781567e3cf07978d7a84122f`.
- Locally computed Git blob SHA1: `6af34fca5b24e880a629284d8c915e7a759045b7` (not a commit identifier).
- LICENSE SHA256: `c6cb470a9ba0a50d57611aeec1f31da609c5aefdbee8eac7f289bcb0e30625fa`.
- Actually read upstream README, LICENSE, npm/package.json, tinycolor.js and build.js at the fixed release. package-audit.json preserves that package declaration; it declares no runtime dependencies, a test-only devDependency, and a test script. No install/build/test scripts from upstream were executed.
- Browser UMD is self-contained with no external runtime imports. Build source uses rollup 3.13.0, terser 5.16.1, rollup/plugin-babel 6.0.3, Babel core 7.20.12/preset-env 7.20.2; those build tools were read, not installed or executed. This review is not a full historical build-chain reproduction or complete supply-chain audit. No browser runtime fetch/XMLHttpRequest/WebSocket/require calls were found by a limited text inspection.
- MIT permits commercial use with copyright/permission retention; no claim of current active maintenance (the pinned release is from 2023).
- Website integration is a self-written Chinese contrast checker shell, not a full upstream application. It only accepts opaque 3/6-digit HEX sRGB colors and uses TinyColor readability/isReadable. PNG/JSON exports are browser-local, without API/CDN/upload.
- W3C reference checked 2026-11-04: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html . Normal AA threshold4.5, large AA3; decisions use raw values. Whole-page accessibility, images/gradients/transparency/print conditions are outside scope.
