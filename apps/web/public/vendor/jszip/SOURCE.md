# JSZip browser artifact

- Upstream: https://github.com/Stuk/jszip
- Version: 3.10.1; fixed tag commit: `0f2f1e4d0509514417db83fe5b86bde90e0ffe8d`.
- Artifact: upstream `dist/jszip.min.js`, 97,631 bytes; original banner retained.
- SHA256: `d14e71a95ef3290dec66a9cfdd8a37c2dd624f6f2b594c4512f607d4a56e19fc`.
- Upstream offers MIT OR GPL-3.0; this integration chooses MIT. Original dual-license text is preserved in LICENSE.txt.
- The upstream browser bundle contains dependencies. THIRD-PARTY-NOTICES.txt retains supporting license texts; reviewed declaration-source versions include pako 1.0.2, lie 3.3.0, readable-stream 2.3.6 and setImmediate 1.0.5. These are source/declaration references, not proof of every exact transitive version embedded in the minified artifact. No complete supply-chain audit is claimed.
- Self-written Chinese website shell only uses archive creation, never imports or extracts a ZIP. Selected files remain browser-local; no remote CDN, server upload or external API.
- Sourced/pinned by root; wrapper acceptance dated 2026-11-04. No package or install script was run by this wrapper task.
