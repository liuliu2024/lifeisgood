# Third-party notices and license status

Own project code: MIT, see LICENSE. Runtime dependencies retain their original licenses. Models, fonts and assets are not relicensed by this repository.

| Direct dependency | License evidence | Shipped use |
| --- | --- | --- |
| Next.js, React, React DOM | MIT (installed package notices) | web runtime |
| IBM Plex Sans / @fontsource package | OFL-1.1 font license (package LICENSE) | self-hosted font |
| FastAPI, SQLAlchemy | MIT (package notices) | backend |
| Pillow | MIT-CMU (project LICENSE) | image processing; wheel includes codec notices |
| python-docx | MIT (package LICENSE) | DOCX export |
| python-multipart | Apache-2.0 (package license) | multipart handling |
| Uvicorn | BSD-3-Clause (package license) | local API server |
| Playwright | Apache-2.0 (package LICENSE) | development test only |

Exact dependency trees are in uv.lock and package-lock.json. Retain the dependency notices from distributed wheels, packages and fonts. This table is not a completed transitive binary distribution audit; shipping containers/binaries requires inventorying embedded codecs and libraries.

No rembg/BRIA weights, LiteLLM enterprise code, paid models, third-party stock pictures, customer logos or testimonials are included. Do not add any without separate license review.
