# markdown-it browser artifact

- Upstream: https://github.com/markdown-it/markdown-it
- Version: npm `markdown-it@14.1.0`; corresponding Git tag commit `0fe7ccb4b7f30236fb05f623be6924961d296d3d`.
- Artifact: official npm `dist/markdown-it.min.js`, 123,618 bytes; original MIT banner retained.
- SHA256: `38c70a1e7ca91ab40e2d9e6e60129851a717ed1c7d4acbbdd41bf9503791cf68`.
- npm integrity: `sha512-a54IwgWPaeBCAAsv13YgmALOF1elABB08FxO9i+r4VFk5Vl4pKokRPeX8u5TCgSsPi6ec1otfLjdOpVcgbpshg==`.
- Root obtained the package with `npm pack --ignore-scripts`, retained its package/LICENSE/dist and inspected package scripts/declarations. No dependency installation in this wrapper task.
- MIT original LICENSE.txt retained. Browser bundle includes dependencies; THIRD-PARTY-NOTICES.txt retains supporting notices from entities 4.4.0, linkify-it 5.0.0, mdurl 2.0.0, punycode 2.3.1 and uc.micro 2.1.0. These supporting source versions/declarations are not a verified exact bill of all bundled transitive components. Argparse is declared by upstream for its CLI, which this website does not install or invoke. This is not a complete supply-chain audit.
- Chinese note shell is self-written, not the upstream's complete notes application. It uses `html:false`, `linkify:false`, disables HTML/image parsing, and does not fetch external content. Disabling the image rule can leave `!` followed by an ordinary safe link; no image element is created or loaded.
- Exported HTML adds a restrictive CSP (`default-src 'none'`, inline styles only, no base/form action); ordinary links require explicit user activation and use noopener/noreferrer.
- Sourced/pinned by root; wrapper acceptance dated 2026-11-04.
