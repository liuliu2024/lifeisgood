# decimal.js — DAILY-045

Reviewed2026-11-04. This is a Chinese wrapper for finite daily arithmetic; not an expression evaluator, financial, tax or trading advice service.

- Upstream: https://github.com/MikeMcl/decimal.js
- Actual npm version **10.6.0** downloaded using `npm pack decimal.js@10.6.0 --ignore-scripts`. No install/lifecycle/test/build script executed and no main dependency/lock change.
- Artifact: https://registry.npmjs.org/decimal.js/-/decimal.js-10.6.0.tgz
- Independently calculated archive SHA512 matches registry: `YpgQiITW3JXGntzdUmyUR1V812Hn8T1YVXhCu+wO3OpS4eU9l4YdD3qjyiKdV6mvV29zapkMeD390UVEf2lkUg==`.
- **Provenance discrepancy preserved:** GitHub v10.6.0 points to `1a6e845004b29a3b7dcef78fe92b8d786634f4e2`, while npm metadata gitHead is `f1ee2f404d6bf96d59c04db80c1f404742afa3fa`; fetching decimal.js at npm gitHead returned404. They are not claimed identical commits. Fixed tag source was retrieved and compared to the actual npm decimal.js: only CRLF versus LF differs. After LF normalization both SHA256 are `0bc0d6920e8852b4a2bb0cf9963b101c22f7029b42c8b12c9e27fd24021dff04`. The published browser artifact is retained with original bytes, not normalized.
- Running `decimal.js` SHA256: **6e99821f8204c5f611b56077e3fce056a1562d22bc341a1f4af01afe7e527d83**.
- Actual full MIT license read, Copyright2025 Michael Mclaughlin; original LICENCE.md SHA256 `3108b546bcff5d346923a82f48b2d252ca722f9088076db6d145f6b67757ad6c` retained.
- Actual README/package read: no runtime or dev dependencies declared in published package; script only `test: node ./test/test.js`. Browser entry is a self-contained JavaScript file. No fonts/images/workers/CDN/remote resources. Optional library crypto random facilities are unused; wrapper only exposes arithmetic through a cloned constructor. No eval/expression parsing.
- Wrapper validates ordinary decimal strings before construction; at most24 integer/12 fractional digits, internal80 significant digits, display0–12 decimal places and explicit half-up or half-even rounding. Division repeating decimals remain bounded approximations. Results use decimal strings in JSON to avoid binary floating-point reparse. Split mode uses nonnegative total with at most2 decimals,1–100 persons and integer cents/remainder conservation.
- Actual audit package/README/tag source remain ignored `.cache/decimal-audit`, not public assets. Public assets only runtime, original license, this provenance. Current integration evidence: `docs/tasks/DAILY_CALCULATOR.md`.
