# Chart.js 本机图表封装来源

审查日期：2026-11-04。DAILY-041。只采用浏览器图表库，不是完整电子表格、BI产品或自动商业分析系统。

## 固定源码与浏览器制品

- 仓库：https://github.com/chartjs/Chart.js
- Tag：v4.5.1；`git ls-remote` 返回提交 `9c5cf9fac7ec04a71b516e2aff3f7d76876be369`，与npm元数据gitHead相同。
- 包：`chart.js@4.5.1`，https://registry.npmjs.org/chart.js/-/chart.js-4.5.1.tgz
- 下载：`npm pack chart.js@4.5.1 --ignore-scripts`，仅提取已发布制品，不执行安装或构建脚本，不改主package/lock。
- 实际运行：原始 `dist/chart.umd.js`，保留文件名与全部原字节。SHA256：`ecc3cd1eeb8c34d2178e3f59fd63ec5a3d84358c11730af0b9958dc886d7652a`。npm包SHA1：`19dd1a9a386a3f6397691672231cb5fc9c052c35`。包/许可SHA256见SHA256SUMS。
- 原tgz、README、package、source map、固定Git根LICENSE与pnpm-lock、审查记录在 `apps/web/.cache/chartjs-review`，不作为运行资源公开提供；交付证据另存外层outputs/daily-charts-source-review。source map注释保留在原bundle里，未为删注释而修改bundle。

## 根许可、内嵌代码与脚本

`LICENSE.md` 为原始MIT全文（Copyright 2014–2024 Chart.js Contributors），与固定Git提交根LICENSE逐字节相同。bundle另有2025 Chart.js Contributors版权头，一并原样保留。

包唯一直接运行依赖声明为 `@kurkle/color:^0.3.0`。实际UMD source map中唯一node_modules来源为 `@kurkle/color@0.3.2/dist/color.esm.js`，固定源码pnpm锁也为0.3.2；其source map内嵌内容与 `npm pack @kurkle/color@0.3.2 --ignore-scripts` 提取的color.esm.js逐字节相同。已保留其完整MIT许可 `KURKLE_COLOR_LICENSE.md`（Copyright 2018–2021 Jukka Kurkela），不把本依赖计为额外工具。color包无运行dependencies，其build/lint/test仅开发脚本，未执行。

Chart.js scripts为Rollup/TypeScript构建、Karma/浏览器测试、lint、文档等，无install/preinstall/postinstall/prepare生命周期脚本；本轮全部未运行。devDependencies、文档资源和插件生态不作为采用范围。README中的外站logo/badge只作来源审查，页面不渲染README，不加载其远程素材。

## 封装与资源边界

只使用本机文本、数值、色块和系统字体（Microsoft YaHei/system-ui），无CDN、远程字体/图片、上传、API或AI。2–12行，每行标签与普通十进制数字；标签12 Unicode字符，标题40字符，总数据2000字符，数字±10亿/6位小数。拒绝空项、重复标签、控制/隐藏方向字符、公式、科学计数法、千分位等歧义格式。圆环拒绝负数/全零。图尺寸仅1200×800或960×960，devicePixelRatio固定1，禁动画与事件。

图在临时canvas生成，实际PNG同时作为预览与下载；完成、错误、编辑、换类型和卸载均destroy图实例并将canvas尺寸归零，撤销旧blob URL。异步编码使用轮次和同步锁；编辑取消旧编码，迟到回调不得成为新结果。组件加载和PNG编码各有8秒截止；组件失败可显式重试，编码失败解锁且清旧结果。包只提供绘制能力，数据意义及图类型由用户选择，折线按输入顺序连接，循环色板不代表类别语义。
