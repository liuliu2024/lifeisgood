# Day.js date-only runtime source

- Repository: https://github.com/iamkun/dayjs
- Version: 1.11.23, source commit reported by npm gitHead: 4549b8d03307891143e8a50d39fcdab1f16f77cf
- The source package.json at the reported gitHead was read and says 0.0.0-development; this source manifest is not advertised as the published runtime version. The shipped runtime is pinned to the independently downloaded npm 1.11.23 archive.
- Original registry archive: https://registry.npmjs.org/dayjs/-/dayjs-1.11.23.tgz
- Original tgz SHA-1 verified: b0a363506dde5f36cf5075e42ebe8115165a8c79
- Download: npm pack dayjs@1.11.23 --ignore-scripts. No install/build/test/lifecycle scripts were executed. No main lockfile change.
- Shipped unchanged files: dayjs.min.js, plugin/utc.js, LICENSE. SHA256SUMS contains actual original-byte hashes.
- Full original MIT Copyright (c) 2018-present, iamkun retained. Repository LICENSE at the exact npm gitHead was actually read through the official GitHub connector and matches the package original text. UTC plugin source at that commit was read; package UTC browser artifact reviewed. No claim that minified npm output was rebuilt byte-identical from source.
- No runtime package dependencies, extra locale/tz data, external fonts/assets or CDN. Core's built-in English locale is not used for user-facing date labels. UTC plugin is part of the same Day.js project/MIT license, not an additional counted project.
- Runtime code review found no eval, remote import, network requests, external runtime helpers or embedded third-party notices in these two fixed files. UTC plugin extends Day.js core; date arithmetic uses the original library.
- Script review: upstream development test scripts run multiple TZ suites; build invokes Babel/build/size and sauce uses npx/karma. They were not run. Package has no runtime dependencies and no preinstall/install/postinstall/prepare scripts.
- Platform wrapper: strictly accepts YYYY-MM-DD, 1901–2099 and finite integer offsets ±36500, validates format roundtrip, computes UTC-midnight date spans/day shifts and exports TXT/JSON. Rejects impossible dates and results outside the supported year range. No official holiday/workday calendar, timezone conversion, lunar dates or system clock needed.
- Stars 48655 and repository push 2026-09-15 were read 2026-11-04 as dated research metadata, not a quality rating or a runtime version pin. This is a Chinese platform wrapper around the fixed library, not a full upstream application installation.
