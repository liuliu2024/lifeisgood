# Rough.js 本机手绘生活卡片来源

日期：2026-11-04。DAILY-043，仅有限文字和几何卡片封装，不是照片拼贴或完整图像编辑器。

## 固定来源与制品

- 仓库：https://github.com/rough-stuff/rough
- npm：roughjs@4.6.6；npm gitHead固定为 `56a2762171b1294d643501e8d14f120db6b27bd7`。本轮v4.6.6/4.6.6标签查询无返回，因此使用提交固定。
- 实际制品：https://registry.npmjs.org/roughjs/-/roughjs-4.6.6.tgz 中 `bundled/rough.js`（浏览器自含IIFE），27.8KB原始字节；未修改、未重打包。
- 运行文件SHA256：`6853af8619532f3939b156cd16824d2e14f31e71d3df306ad5558eeafacab194`；npm tgz SHA1：`1059f49a5e0c80dee541a005b20cc322b222158b`。其他原文哈希见SHA256SUMS。
- 只执行 `npm pack ... --ignore-scripts` 下载，未安装或执行上游脚本，不改主依赖锁。原tgz/README/package、固定提交package-lock、rollup配置与根LICENSE保留在apps/web/.cache/rough-review，独立交付备份在外层outputs/sketch-card-source-review。
- 固定Git提交的根package.json与npm package.json逐字节相同；根LICENSE也逐字节相同。README中的外部示例图片/网址仅用于说明审查，不渲染或加载进卡片工具。

## 完整运行依赖许可

根Rough.js：MIT，Copyright (c) 2019 Preet Shihn，原文LICENSE保留。

固定提交package-lock及实际bin模块引用审查得到以下完整依赖图，四个去重运行包均保留各自MIT全文：

| 包 | 固定版本 | 原文许可 | 运行依赖 |
| --- | --- | --- | --- |
| hachure-fill | 0.5.2 | hachure-fill-LICENSE，Copyright 2023 Preet Shihn | 无 |
| path-data-parser | 0.1.0 | path-data-parser-LICENSE，Copyright 2020 Preet Shihn | 无 |
| points-on-curve | 0.2.0 | points-on-curve-LICENSE，Copyright 2020 Preet Shihn | 无 |
| points-on-path | 0.2.1 | points-on-path-LICENSE，Copyright 2020 Preet | 只引用上表path-data-parser 0.1.0及points-on-curve 0.2.0 |

固定rollup配置对bin/rough.js使用nodeResolve输出自含IIFE，因此不需要浏览器再加载这些依赖文件。IIFE构建不使用CJS目标的importHelpers；未选择CJS，不另安装tslib。上述依赖不作为新增工具计数。原包scripts已读：根build为rm/tsc/rollup，依赖build为tsc/lint等；无install/preinstall/postinstall/prepare生命周期脚本。全部构建、lint及占位test未执行；devDependencies不在采用范围。

上游README原署名/致谢保留：部分核心算法adapted from handy（https://www.gicentre.net/software/#/handy/）；SVG弧到Canvas算法参考W3C SVG实现说明并adapted from Mozilla codebase。这里只记录上游原文归属，未额外下载/采用这些工程或素材。五份实际分发许可原文均为MIT，未推断其为完整上游法务认证。

## 实际封装边界

只提供4种固定几何装饰（圆/矩形/三角/菱形）、1–6个对象、2种填色、3档笔触、1024×768/768×1024两种尺寸。标题1–16字符；正文1–3非空行，每行20字符，总200字符。拒绝HTML/SVG标记、图片地址/链接、控制及隐藏方向字符。色值只接受六位HEX，种子1–999999999；每个固定图形派生确定种子。文字用textContent及XMLSerializer，不使用innerHTML。

下载SVG在生成后再次检查元素/属性白名单（svg/rect/desc/g/path/text）、命名空间、无href/style/事件/URL，最多100节点、200KB及有限路径数据。PNG只由这个安全SVG栅格化；预览与PNG下载同一blob。组件加载及图片生成均8秒截止。编辑/换形状/种子/重置/错误/卸载取消旧编码、清画布、释放图片及blob URL；同步锁防连续点击，旧轮次结果不写新状态。无照片、任意SVG导入、上传、外部图/字体、API、模型或公网发布。

系统字体不是手写字体；手绘感来自Rough.js几何线条。SVG文字保留系统字体，在其他系统字形可能变化；同一环境相同设置和种子经实际SVG字节及PNG像素重复验证。跨浏览器/真机打印未验。
