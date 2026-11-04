# d3-cloud 2.0.0 — finite browser-local word cloud

Upstream https://github.com/jasondavies/d3-cloud . Version2.0.0 released2026-10-30. Annotated tag v2.0.0 object c586d8f68cf84261fed0b5ad112eb57eaf79617d peels to actual source commit5a7696bdcc3330aed91828b36e1651c4f8433a90, equal to npm gitHead. Verified via git ls-remote refs/tags/v2.0.0*. A raw fetch using the tag object initially returned404; it was not misrepresented as a source commit. Actual tag commit src/index.js/layout.js/sprite.js and build/d3-cloud.js all match npm archive bytes.

Official tarball https://registry.npmjs.org/d3-cloud/-/d3-cloud-2.0.0.tgz independently verified SHA512 sha512-zIHF7jUkviSOyC0IhrTK3hsiK+sscRYs5JDeQ+SQyeuXs4UZj7gFThBwzJpGmZBElFEQ6jLGeHPNlubvhTY1xw==. Original browser build and complete BSD3 license retained unchanged, Copyright2013 Jason Davies. Original source notes Wordle-inspired algorithm due to Jonathan Feinberg; retained source build comments, no separate external runtime code/font/image.

Actual runtime dependencies: none. 2.0.0 ESM build bundles local layout/sprite modules; no imports in supplied build, no d3-dispatch. Wrapper uses actual new CloudLayout/getSprite/place/overflow(false)/strategy API, not obsolete1.x start/stop/on. No upstream scripts executed or new installation/main lock edits. Scripts reviewed: esbuild build, pretest build, node --test/typecheck, check:examples/package. canvas/esbuild/tsc and d3-cloud-v1 are upstream devDependencies, not installed or distributed.

Authored worker.js is repository MIT wrapper and imports only local d3-cloud.js in real moduleWorker with OffscreenCanvas. Input only bounded text+integer weights, fixed generic local sans-serif; never image/HTML/URL objects. Any optional upstream image API is not exposed. Per word12000 strategy candidates,total150000 plus initial placement attempts; internal3s deadline, main-thread5s terminate watchdog, cancel/edit/unmount terminate. No outside network/font/CDN/upload/API.

Input1–40 distinct words,each1–20 Unicode codepoints;integer weight1–100;4096UTF16 units/12KiB total;fixed1000x640 or600x400;horizontal23–72px;font determined by local device,not distributed. Missing words explicit in UI/JSON,not silently dropped. SVG textContent-generated,PNG same local font. Fonts can differ across devices,so SVG portability does not guarantee exact glyph pixels;PNG preserves this device. Full limits/current results in DAILY_WORD_CLOUD.md.

SHA256 original files:
- d3-cloud.js: 471dee1d5ba443b3745ee2780d2f15e12a0705dbd093cda6cd2653fc43b43c32
- LICENSE.txt: 8412307d8a3d0d51fa8545899500dcd65ee62f0d9926cc9f5eaad6dc03ea94e2

Authored wrapper SHA256:
- worker.js: 2bc26d247b844925f43801f79fd7bee86431b3291b7b4bcc3fc9ed13e707015d
