# Konva browser artifact for local photo collage

- Repository: https://github.com/konvajs/konva
- Fixed source tag: 9.3.18; resolved GitHub commit `6e28a2a93b5bb9be2f98fb4213127528d3241eb7` (2024-12-23).
- Read tag README, LICENSE and package.json (including scripts/devDependencies). GitHub metadata currently classifies the repository license as OTHER/NOASSERTION; the actual fixed-tag LICENSE was read and is MIT, with both KineticJS original and Konva modified-work attribution. Metadata was not substituted for reading the license.
- Git tag does not expose the built minified file at the requested root path. Actual browser artifact was obtained from official npm `konva@9.3.18` using `npm pack --ignore-scripts`; no dependency installation, lifecycle/build/test script, package.json or lock change.
- Tarball: https://registry.npmjs.org/konva/-/konva-9.3.18.tgz ; archive SHA1 `20979ae78c51aaabdf7c16ac568fe0e3a649d3ed`.
- npm integrity: `sha512-ad5h0Y9phUrinBrKXyIISbURRHQO7Rx5cz7mAEEfdVCs45gDqRD8Y0I0nJRk8S6iqEbiRE87CEZu5GVSnU8oow==`.
- Served `konva.min.js`: 174,558 bytes; SHA256 `9c635447e595b43c3f6c15026e8cfa83f668066034f35d04cddf3dff6888d9b6`. Original MIT/banner/date and KineticJS/Konva attribution remain unchanged.
- Served LICENSE.txt: 1,172 bytes; SHA256 `7190132c82df30243dc2ba512c9509ea3b629329b4266e9f2c3b5dbd04029613`.
- Served package-audit.json SHA256 `71440dbeb5a3492c25158cb156005218202dcc0bf2521b4e134d4bbd6934cb34`; this is the exact npm package declaration, retained for review.
- Archive member names were checked for absolute/parent paths, then only three exact files were extracted without executing anything. Original npm tarball remains in ignored cache.
- package declares no runtime dependencies. Node usage asks users to install canvas separately; this browser-only integration does not install or invoke Node canvas. Build/test tooling (Rollup/Gulp/TypeScript/Parcel etc.) was read, not run or installed. Browser UMD includes its canvas framework and filters; only Stage/Layer/Rect/Image dragging/export APIs are used. No claim of exhaustive historical build/transitive-license or security audit.
- Source tag and exact npm artifact are separately fixed. An additional npm gitHead metadata request failed ECONNRESET; npm publishing gitHead has not been independently established and is not falsely equated with the Git tag.
- Initial normal-network npm request failed EACCES; authorized bounded network retry succeeded. The runtime serves the stored local file; no CDN or server upload/API.
- Self-written Chinese collage shell, not an upstream complete editor or PS. Scope: 2–6 local JPG/PNG, arrange/drag/scale, background/preset dimensions and PNG export. Text/stickers/face swapping/retouching are not integrated.
- Verified local wrapper on 2026-11-04; other/newer Konva versions were not silently substituted.
