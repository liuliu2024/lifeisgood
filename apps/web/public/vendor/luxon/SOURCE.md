# Luxon3.7.2 local ESM — DAILY-052

Official repository https://github.com/moment/luxon . Official GitHub tag-ref API for3.7.2 fixes actual source commit4262a38ded7762e22608a9feb9f117b40d338ced, equal to npm gitHead. git ls-remote/raw requests timed out; official contents API fetched src/datetime.js at that commit and it is byte-identical to actual npm source. No false claim of successful git clone.

Actual npm tarball https://registry.npmjs.org/luxon/-/luxon-3.7.2.tgz independently verified SHA512 sha512-vtEhXh/gNjI9Yg1u4jX/0YVPMvxzHuGgCm6tC5kZyb08yjGWGnqAjGJvcXbqQR2P3MyMEFnRbpcdFS6PBcLqew==. Original build/es6/luxon.mjs and LICENSE.md retained byte-for-byte. Runtime package dependencies:none.

Complete MIT license Copyright2019 JS Foundation and other contributors retained. ESM contains explicit adaptation of moment.js week-calendar-utils.js at original commit000ac1800e620f770f4eb31b5ae908f6167b0ab2; its exact original MIT LICENSE fetched through official GitHub contents API is retained as MOMENT_LICENSE.txt. No other copied-code copyright notice found in selected ESM. The global build contains Babel helper code and is deliberately NOT distributed; original native ES6 module has no Babel helper definitions or external imports. loader.js is this repository MIT bridge, imports only local luxon.mjs,not upstream code.

Reviewed package scripts:build/build-global invoke Babel tasks;prepack builds;prepare invokes husky;docs/test/site tools have additional development commands. None run; direct tarball download/extraction only. No installation, external timezone/locale package, main lock changes,CDN/API/location permission or uploaded input. Browser/OS Intl supplies IANA rules; version cannot be reliably queried, future policy changes require independent official confirmation. No promise that fixed library equals current future laws.

Bounded wrapper:9 allowed zones,local input years2000–2035,minute precision. Checks exact date/time fields after Luxon construction to reject normalized nonexistent local times. getPossibleOffsets returns validated unique candidates;ambiguous times need explicit user radio selection before output. At most9 output rows,TXT/JSON each<=32KiB. All edits clear candidates,selection,downloads; synchronous bounded conversion has no pending old calculation. Module dependency failure offers full page refresh so browser failed-ESM cache cannot block recovery.

Original SHA256:
- luxon.mjs: b495ad5cabea3439d04387e6622f2c3fa81d319424d9d76d9e7f874ac5a0807a
- LICENSE.md: 6cb2f2bf697ee9c6fa9eb8f227c63ee6e7a3cba42d4717f14c745ef9b6cbc006
- MOMENT_LICENSE.txt: 8f38f320bbf5eb84c08e08676f7ee1d2204ebe5797f6a090d077329cf212fca3

Authored bridge SHA256:
- loader.js: 0b4f2288918f621b16707b57b7c501811c893e6e67bdc6985c9c6d8554a3b38b
