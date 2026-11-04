# lucky-canvas 转盘组件来源

读取日期：2026-11-04。DAILY-036，中文本机生活选择转盘封装；不是完整上游抽奖应用。

- 仓库：https://github.com/buuing/lucky-canvas
- 固定提交：7a8c0bbcb992a297b390e3a2ebaa1a3385c1f2f9；本轮 `git ls-remote --tags` 没有返回标签，因此以提交固定。该提交 `packages/core/package.json` 为 1.7.26，与发布包 package.json 字节相同。
- 固定浏览器制品：npm `lucky-canvas@1.7.26`，`https://registry.npmjs.org/lucky-canvas/-/lucky-canvas-1.7.26.tgz`。使用 `npm pack --ignore-scripts` 下载，不执行安装或构建脚本。
- 发布包 SHA1：24e4bef80b333ff1b0c8a4c0288f8b33bd56418f。完整SHA256在 `SHA256SUMS`；UMD SHA256为 f38b94084600f62c2760efe86658ab97ae9c31a4c4d4cc5a5af5af00e95562c8。
- 实际执行 `dist/index.umd.js` 的原始字节，重命名为 `lucky-canvas.umd.js`，未修改。原 tgz、source map、README、package.json及固定上游审计文件保留在 apps/web/.cache/lucky-canvas-review（不公开提供），运行目录保留 Apache-2.0 `LICENSE`（Copyright [2021] [Li Dong Qi]）。转盘源码 `upstream-wheel.ts` 与制品source map内嵌wheel.ts逐字一致（仅比较时归一化CRLF）。
- UMD source map 来源清单只有上游源码与内嵌 `tslib/tslib.es6.js`；UMD开头完整保留 Microsoft Corporation 的许可及免责声明。未选择含core-js的 `dist/lucky-canvas.js`。不把开发依赖当运行依赖安装。
- 包的 `dependencies` 为 `{}`，开发脚本只有 rollup dev/build，无生命周期安装脚本。固定Git根package有 `install: lerna bootstrap`，本轮未运行该根项目安装/构建脚本。未审计或采用全部devDependencies。
- README包含远程logo/badge/文档链接；仅作为文字来源文件保留，页面不渲染这些内容，不加载其图片。转盘只使用文本、纯色块、系统字体；无图片、CDN、远程字体、API或模型。

## 封装与生命周期

`wheel-frame.html`、`wheel-frame.js` 是自有适配器。上游没有公开destroy方法，其stop(-1)在减速阶段也会提前return。本封装因此让每轮转盘运行于独立iframe；编辑、重置和页面卸载会移除旧iframe，销毁该浏览器文档的requestAnimationFrame、resize监听和MutationObserver。父页面核对消息来源、同源和轮次；旧回调不能写入新轮。不会宣称调用了上游不存在的destroy。

由上游实际end回调提供结果，使用实际rotateDeg计算顶部指针扇区并核对一致后才记录。选择使用Math.random，选项等角度，stopRange为0以停在格子中心；不承诺密码学公平或可审计开奖，不用于金钱、奖品和营销。

本封装对ready加载与result返回分别设置8秒截止。超时立即失效轮次、移除iframe、解锁并清结果，中文提示重试；修改、重置和卸载均清除旧定时器。实例化前检查LuckyWheel构造器存在；上游脚本被阻断时等待父页有界失败，不访问缺失的全局变量，不永久停在“准备中”，不把失败轮次记为结果。

仅接受2–20个选项、每项24 Unicode字符，1500总长度；拒绝空行、控制/隐藏方向字符和NFKC归一化后大小写不敏感的重复项。选项和结果JSON仅本机下载。最多8项时转盘短名最多6字并附序号，超过8项仅显示序号避免拥挤，完整文字列在页面名单和JSON。
