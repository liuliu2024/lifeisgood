# pdf-lib 1.17.1 local distribution

GitHub: https://github.com/Hopding/pdf-lib ; fixed v1.17.1 source commit 4beebbef7a261ed0be089bb1d63a5b6e28cc488a (prior LAB pin; not newly presented as a new Git checkout). Reused official npm UMD from existing LAB. On 2026-11-04 downloaded official https://registry.npmjs.org/pdf-lib/-/pdf-lib-1.17.1.tgz, independently checked lock SHA512 sha512-V/mpyJAoTsN4cnP31vc0wfNA1+p20evqqnap0KLoRUN0Yk/p3wN52DOEsL4oBFcLdb76hlpKPtzJIgo67j/XLw== and extracted dist matches LAB/public SHA256. Audit tgz, metadata, lock and scripts stay in .cache/pdf-lib-audit, not public. No new install or upstream scripts executed. Reviewed release/build/clean/test scripts, no install lifecycle scripts in locked packages.

UMD bundles runtime dependencies @pdf-lib/standard-fonts1.0.0 MIT (metrics, not font programs), @pdf-lib/upng1.0.1 MIT, pako1.0.11 MIT AND Zlib, tslib1.14.1 0BSD. Full original package licenses and copyright retained in licenses/. Additional bundled notices: base64-arraybuffer Copyright2012 Niklas von Hertzen MIT; Christopher Brown afm MIT Copyright2015–2018 (original README and author license page retained, fragment selects date); pdfkit Copyright2014 Devon Govett MIT; Mozilla Foundation Copyright2012 and Glyph & Cog Copyright1996–2003 Apache2 stream ports. Apache2 license and original bundled source notices included. Standard font AFM copyright/trademarks retained separately; Adobe Core14 AFM redistribution paragraph reproduced unchanged from Apache PDFBox2.0.24 LICENSE, upstream conversion/compression noted in AFM-MODIFICATIONS.

Original additional license sources (2026-11-04): https://www.apache.org/licenses/LICENSE-2.0.txt ; https://raw.githubusercontent.com/foliojs/pdfkit/v0.10.0/LICENSE ; https://raw.githubusercontent.com/niklasvh/base64-arraybuffer/v0.1.5/LICENSE-MIT ; https://chbrown.github.io/licenses/MIT/#2015-2018 ; https://raw.githubusercontent.com/apache/pdfbox/2.0.24/LICENSE.txt (Adobe AFM excerpt).

Runtime wrapper: File.arrayBuffer -> PDFDocument.load -> copyPages -> save -> Blob download. No remote URL/API/worker/CDN. Native browser PDF viewer renders selected local blob only after user clicks preview. No new Chinese typesetting/fonts/OCR/encrypted files. Every input <=20MiB/200 pages; two inputs<=40MiB; output<=400 pages/60MiB. Limits are wrapper boundaries, not upstream performance guarantees.

SHA256 files:
- pdf-lib.min.js: 0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f
- licenses/Adobe-Core14-AFM.txt: f09628f95cdb1c81312e29d3c57ece55ac1b7e66b9c9b29db55ab81ca9f52b79
- licenses/AFM-MODIFICATIONS.txt: 58c7db4bbbfd251374054da2e27a7d3b026fc7b967ab268cae4a1aefac8a4314
- licenses/Apache-2.0.txt: cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30
- licenses/base64-arraybuffer-MIT.txt: f3eca6ff762533fa5a77caf954a143e48afa204668cf97dce758c45a9e006be3
- licenses/bundled-source-notices.txt: 69481a1df4a6cc174dd80a71f85383c375fc6508a5dde8da002c56b62d9c5b86
- licenses/Christopher-Brown-MIT.html.txt: e03c2f13f8a96d630177421ed460320415b7f854100ffe5238f964d860559ed0
- licenses/pako-MIT.txt: a04665b3b2de56c66730c1f720f528175739e4104f79073614aa611da1e85539
- licenses/pako-Zlib-notice.txt: 170d7d544d380b38d5f76ab5eda29475b44ef537f4564163d6d9bece85c51c13
- licenses/pako-zlib-README.txt: d8b499598e43d755ea8918448128259ff01820c50d94d5a48c8883d0a594ddb1
- licenses/pdf-lib-MIT.txt: f2c9fc00fdb66eb99ac156ba52d734af66d8d309f65753ae809ad34ee2883bcb
- licenses/pdfkit-MIT.txt: 5f0d5197d2b5d91f41de43143b0be42fb55515bc2b894f2a9b62de9f7056c0f8
- licenses/standard-font-metric-notices.json: 0e7a3d0cb9a4a43ec53f8b8f404cb079488b2b44b7d9eea7aa7f19b54d146196
- licenses/standard-fonts-MIT.txt: 45cc2bb9957ed43f5c7f5eb1912f9f670730394d614079510477cae626194649
- licenses/standard-fonts-README.md: 3d90382b943272684c0387f6a25fc22ba93b823bbb5836b899a624b4a848450b
- licenses/tslib-0BSD.txt: 210b19e543130388c68654b7497e967119ce17145f66ab7d85688fbd70f08751
- licenses/tslib-CopyrightNotice.txt: dd835e67a9a297da32f9467d7677a5d02c8e50e10f15da43b810147c79c04b9b
- licenses/upng-MIT.txt: c1fb8861eca211bf5aea574358aba7039396c0c1824c2a1477cc126d398efd89

Author-license HTML is archived unchanged as .html.txt (text/plain); its original fragment-driven date script is not served as executable same-origin HTML. The original source URL and bundled copyright notice remain above.
