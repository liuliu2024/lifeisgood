# PapaParse 5.5.3 — fixed local browser distribution

Repository: https://github.com/mholt/PapaParse
Tag 5.5.3 resolves to commit a4f8b0f1e30bf08e44da96ff5575ffdae7aa9b12 (git ls-remote, 2026-11-04).
Original files fetched byte-for-byte from https://raw.githubusercontent.com/mholt/PapaParse/a4f8b0f1e30bf08e44da96ff5575ffdae7aa9b12/ .

License: MIT; original LICENSE and copyright header retained. Runtime dependencies: none. package.json devDependencies are upstream build/test-only; none installed here. Scripts reviewed: lint=eslint; build=grunt build; tests invoke mocha and browser scripts. No install/preinstall/postinstall scripts. No package installation, build scripts or unknown upstream scripts executed; supplied browser artifact used unchanged.

Runtime: wrapper only supplies decoded local text to Papa.parse; worker:false, download:false, header:false, dynamicTyping:false. No worker or remote URL accepted. NetworkStreamer/XMLHttpRequest code exists upstream but unreachable from these wrapper inputs. Papa.unparse runs on bounded string arrays.

Limits: 2MiB input; 10000 parsed records including first row, 100 columns, 200000 cells, 20000 UTF-16 units per cell; parser.step aborts early, no truncated export. 20 preview rows. Strict fatal UTF-8 decoder, BOM handled; no GBK guessing.

SHA-256 of original files:
- LICENSE: 99aa68e4b42758b09828a46515f70369e5463458ab7a990189f641af2b8d9b4e
- package.json: 33ffa1b7b9c33ceda14e25fb7d7080098fd258f80b6dea4b37e3de34029b75fd
- papaparse.js: 10778b8bb3e20177c52febb99e18ec53fd97ce447f4716ca10e00bae18a98594
- papaparse.min.js: 3553fb8bdf5b8004ce5531e6827e81c8b34e7b3992677967754544064e97b016
