# jsdiff / diff 8.0.2 — bounded character ESM integration

Repository: https://github.com/kpdecker/jsdiff
Fixed tag v8.0.2 resolves to commit 4f5c473662bedd672809b689771037d5401bdcc6 (git ls-remote 2026-11-04).
Official npm tarball https://registry.npmjs.org/diff/-/diff-8.0.2.tgz verified against SHA512 sha512-sSuxWU5j5SR9QQji/o2qMvqRNYRDOcBTgsJ/DeCf4iSN4gW+gNMXM7wFIP+fdXZxoNiAnHUTGjCr+TSWXdRDKg==. Unmodified libesm/diff/character.js and base.js plus LICENSE copied byte-for-byte. Tarball/source/metadata stay in apps/web/.cache/jsdiff-audit, not public.

License: BSD-3-Clause, Copyright(c)2009-2015 Kevin Decker. Runtime package dependencies:{}; actual browser dependency closure: worker.js (authored wrapper) -> character.js -> base.js. base.js has no imports and its character tokenizer uses Array.from (Unicode code points). The full UMD is not distributed: unused word/patch APIs include an extra StackOverflow snippet whose license was not independently adopted; these APIs are not in the selected two-module closure. No unknown copied notices appeared in the selected source. Full original BSD license retained.

Scripts reviewed: build invokes lint/tsc/typechecks/rollup/uglify; clean removes upstream build output; test invokes nyc/mocha/build. No lifecycle installation scripts, no scripts executed, no new installation/main lock changes. No runtime third-party dependency or fonts/assets.

worker.js is platform MIT wrapper, not upstream. ModuleWorker imports only local character.js. Inputs are bounded strings:20000 UTF16 units/48KiB UTF8/1000 lines each, valid Unicode, no NUL. diffChars timeout1000ms/maxEditLength2000; main-thread2000ms watchdog calls terminate. Input change/cancel/unmount terminate immediately. Output <=4001segments/512KiB per artifact with exact reconstruction check, no truncation. Main renders React text nodes, never HTML. No URL/file upload/CDN/API/remote assets.

Original file SHA256:
- base.js: faa81734df6ea7f8034efc5572ad1bbf19c50b300fdd183baf0d7813c5eec3b2
- character.js: 75677c2b3c5990099675493b415ce59f92f5de4709de59fa481b9fb563168deb
- LICENSE.txt: eda81a415869e67809f6a9f3fd6056062cb83a462118e07eec5e92b2e0c40ce9

Authored wrapper SHA256:
- worker.js: 0801d4e0c375ec82765e91f8493780552aa99877b43fefc309565abc14f6a6b8
