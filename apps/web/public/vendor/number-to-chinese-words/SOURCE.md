# DAILY-051 actual source: number-to-chinese-words

Reviewed2026-11-04. The original nzh candidate was **not adopted or distributed**: its actual package/repository contained a BSD2 declaration but no complete original license/copyright text. Only private audit evidence remains. This directory contains the explicitly approved single substitute, not nzh code.

- Upstream: https://github.com/digi3studio/number-to-chinese-words
- Actual fixed npm package **number-to-chinese-words1.0.20**, gitHead/source commit **528abc09ad35379d9b244d60d61234d4e8780a18**.
- Exact package https://registry.npmjs.org/number-to-chinese-words/-/number-to-chinese-words-1.0.20.tgz . Downloaded via `npm pack number-to-chinese-words@1.0.20 --ignore-scripts`, no install/build/test scripts run and no main dependency/lock change.
- Actual SHA512 matched registry: `pjqI/H7V+FXrvQ2w9+GQHY6QbyNjYWDJmosjEZGgaParA2bkSxwF1IbsTBZD+R79RL4jkob2whMZDELxOSpH7A==`.
- Original browser runtime `number-to-chinese-words.js` copied without alteration; SHA256 **ca6196242c3fda86f440338044399be32972ac2b4c873cb8e89f99d8f2595293**. Fixed Git contents API version exactly matches npm runtime bytes.
- Complete original MIT LICENSE read and preserved, Copyright2017 digi3studio. SHA256 **247f3f59996c7b32028c3800645bbb0e01d19fcc9c52eaa64d28ab7844849e5b**; exact byte match with LICENSE at fixed source commit. No extra runtime dependencies, no fonts or image assets.
- Actual README/package/source scripts read. Development-only Babel/Uglify/Jasmine build/test tools are not installed/run. Browser artifact is Babel UMD attaching `window.index.NumberToChineseWords`. It contains only constructor/property helpers plus the original conversion, with no network/HTML/URL expression evaluation.
- **Small old project:**2026-11-04 metadata snapshot35Stars, last push2018-09-27, unarchived. Chosen because actual complete license could be verified for a limited integer wrapper, not because it is popular/active or superior to nzh.

## Explicit functional boundary and known failure

The original core coerces numbers through Math.abs/floor/% and is not suitable for arbitrary-precision strings or decimal amounts. Wrapper splits the integer string into at most three four-digit groups and only passes each0–9999 group to the original core, verifying each small result with BigInt. The whole large integer is never converted to Number. Fractions are never converted to Number: ordinary mode maps digits as text; money mode splits jiao/fen strings. More than2fractional digits are rejected, never rounded. Negative values only in ordinary-number mode.

Platform additions: four-digit group assembly with 亿/万 units and explicit zero bridging, leading-one handling for non-first groups beginning with十, simplified Chinese capital mapping, fixed renminbi/yuan/jiao/fen wording and TXT/JSON packaging. These are **not an original library money API** and are not bank/check/legal format compliance.

**Known original algorithm error retained:** `toWords(100010001)` returns `一億零一`, losing the wan group. The original whole-integer path is never used. Platform assembly isolates this cross-group bug while retaining the original UMD unchanged; every0–9999 group and the completed assembled integer are reverse-checked with BigInt. Unsupported or non-preserving core output is rejected, never remapped arbitrarily. Exhaustive10000 small groups plus10000 deterministic multi-group combinations and40 boundaries have new independent Python readback evidence;10 final browser groups verify actual TXT/JSON and known characters, including100010001. This is a platform adapter, not a claim that the original upstream bug was fixed.

All original nzh/alternative audit files, registry responses, API raw fixed files and known failures remain ignored `.cache/nzh-audit`, not public resources. Public assets contain the unmodified alternative runtime, its original MIT, the separate Babel helper MIT and this source record. Current verification evidence and remaining limits: `docs/tasks/DAILY_AMOUNT_WORDS.md`.

## Bundled Babel helper notice

The unmodified UMD embeds Babel `_classCallCheck` and `_createClass` helpers. The upstream manifest declares a Babel6.24.1-era toolchain, without a lock proving the exact build version. These helpers are not an external runtime dependency, but retain their own Babel project MIT notice in BABEL_HELPERS_LICENSE. Complete original text was obtained from official https://raw.githubusercontent.com/babel/babel/v6.26.0/LICENSE (Copyright2014–2017 Sebastian McKenzie). This is the Babel6 project notice, not a claim that this UMD was built with6.26.0 or that6.24.1 package contained a LICENSE file. An independent official babel-core6.24.1 archive SHA1 check succeeded but that archive did not contain package/LICENSE; it was not represented as the license source. No Babel compiler/package scripts were executed; the original runtime bytes remain unchanged.

- BABEL_HELPERS_LICENSE SHA256: f533455c5981c9213689ee68bcc54fb717d8396739781b7e30c344e94323d752
