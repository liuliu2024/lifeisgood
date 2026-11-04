# markmap-view local browser bundle provenance

Read/pinned 2026-11-04 Asia/Shanghai. This is one limited Chinese plain-text mindmap wrapper, not the complete markmap cloud/editor stack. D3 and layout helpers are dependencies, not separate delivered projects.

## Fixed artifacts

- Upstream: https://github.com/markmap/markmap
- `markmap-view@0.18.12`, npm package gitHead `205367a24603dc187f67da1658940c6cade20dce`.
- Original package: https://registry.npmjs.org/markmap-view/-/markmap-view-0.18.12.tgz
- Archive SHA256: `6C3ABCBEA8345FB5AD26A366D745A2B35D49437F4F4C8C4F97F955675A40B1AB`.
- Runtime `markmap-view.js` is unchanged package `dist/browser/index.js`, SHA256 `861EB6D20AF18AAA300878D46D695722A73625C58B40F49236AF027F18B74E07`.
- D3 upstream https://github.com/d3/d3 ; `d3@7.9.0`, npm gitHead `1f8dd3b92960f58726006532c11e9457864513ec`.
- D3 archive https://registry.npmjs.org/d3/-/d3-7.9.0.tgz ; SHA256 `7E36605710A2BA54846797C8C6D888911341B215AE53257DC32A49A0B824355E`.
- Runtime `d3.min.js` is unchanged package `dist/d3.min.js`, SHA256 `F2094BBF6141B359722C4FE454EB6C4B0F0E42CC10CC7AF921FC158FCEB86539`.

Acquisition: `npm view` metadata and `npm pack <package>@<version> --ignore-scripts`. No npm install, no scripts or rebuild, no project package/lock changes. Reviewed actual package manifests, LICENSE, README and browser source. Upstream build source and pnpm lock were read at the pinned markmap gitHead. They confirm IIFE externalizes only D3; other used modules are embedded. Archive/source audit files retained privately, not shipped as public site resources.

## Dependency/license boundaries

- markmap-view: MIT, original `licenses/markmap-view-LICENSE`.
- Embedded markmap-common: workspace version0.18.9 in published view manifest, MIT, `licenses/markmap-common-LICENSE`.
- Embedded d3-flextree:2.1.2 (bundle literal plus upstream lock), WTFPL2, original `licenses/d3-flextree-LICENSE`. This is not MIT.
- Embedded @gera2ld/jsx-dom:2.2.2 per pinned upstream lock. npm metadata says ISC, but actual packed LICENSE is MIT (Gerald); the actual full text is retained as `licenses/jsx-dom-LICENSE`. Do not replace the original text with a metadata guess.
- D3 aggregate browser distribution:7.9.0, ISC, `licenses/d3-LICENSE`, published bundle notice retained. Its manifest lists the D3 module family; the aggregate prebuilt distribution is loaded locally, not installed as30 external runtime scripts. This is not a new independent upstream source audit of every historical D3 algorithm.
- Published view manifest declares @babel/runtime^7.22.6 and peer markmap-common. Pinned upstream lock resolves runtime7.26.0. IIFE is self-contained except D3, uses native browser functions/helpers, and does not import Babel runtime or common at runtime. These npm modules were not installed.
- No user images/fonts/models/assets are shipped. Original audit packages and source manifests remain in private `.cache/markmap-audit`.

## Runtime and safety scope

Our page loads only these2 local scripts. Although the published markmap bundle exports generic remote CSS/JS loader utilities, this wrapper never calls them and passes no user asset options. Markdown/link/image/HTML parsers are not loaded. Every label is HTML-escaped before markmap's internal innerHTML sink. User input must be heading-prefixed plain text, max6000 UTF-16 units /80 nodes /6 levels /100 units per label. Links/markup appear literally, not as executable elements.

Live preview uses markmap's own foreignObject layout with escaped text; downloadable SVG is reconstructed from checked numeric geometry and textContent using fresh SVG text nodes. It does not serialize foreignObject, scripts, styles, events or href. Full original layout is exported before interactive collapse, independent of later zoom/pan. Browser tests and independent Python XML parsing are separately recorded; this is not universal SVG-editor/phone compatibility certification.
