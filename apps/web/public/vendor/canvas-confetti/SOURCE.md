# canvas-confetti 有限庆祝画布来源

2026-11-04，DAILY-053。只用本机有限粒子动画及PNG静帧，不是视频/GIF编码器或完整上游演示站。

- 仓库：https://github.com/catdad/canvas-confetti
- 固定npm包canvas-confetti@1.9.4，gitHead `5f77cdeb0b9f6b69558e8369c63071fc9415f842`。GitHub连接器已独立读到该提交，2025-10-25，“bumping version to 1.9.4”，package版本从1.9.3改为1.9.4。提交链接：https://github.com/catdad/canvas-confetti/commit/5f77cdeb0b9f6b69558e8369c63071fc9415f842 。
- 实际包：https://registry.npmjs.org/canvas-confetti/-/canvas-confetti-1.9.4.tgz；SHA1 `4412a5daa96afd0b4d70ecd66b65ce8db3022b2b`，只npm pack --ignore-scripts下载，不执行任何脚本、不改主锁。
- 实际浏览器文件为原始dist/confetti.browser.js（24,914字节），SHA256 `49f4bcbc56e7ceb5c3d25d13db1d0da965b6cd1c8a54a707bb055be0685b0a95`；原头标明v1.9.4/build2025-10-25，未修改/压缩。
- ISC原LICENSE完整保留：Copyright (c) 2020, Kiril Vatev。包无运行dependencies，src无外包import/require；dist完整包含发布包src/confetti.js原字节及自有简单浏览器包装，无Babel/第三方内联辅助代码。开发Browserify/Terser/测试工具不是采用范围。
- 已读package脚本：build/browserify/minify、pretest/test、lint、dev/devtest/citest，全部未运行；README的CDN和远程示例未采用。Git/raw直连本轮超时、文件连接器传输错误，未把未取得的Git文件伪称逐字节比对；固定提交由npm metadata及成功的GitHub提交读取共同确认，发布包源/制品字节关系实际已核。
- 原tgz、README、package、src及GitHub提交证据在apps/web/.cache/confetti-review与外层outputs/celebrate-source-review；运行目录仅原bundle/原许可/SHA/SOURCE。

## 封装边界

只有用户主动点击才播放：960×640，单轮80粒、140 ticks，另有前台3秒停止截止，无循环发射，固定三组柔和色，无强闪光/音频/通知。用户短祝福1–24 Unicode字符，拒标签/链接/控制或隐藏方向字符；Canvas纯文字与React文本渲染。只使用square/circle内建形状，不接受外部照片、字体、任意SVG路径或文本位图。

使用自有canvas，resize:false/useWorker:false，不创建Worker或全局resize监听。stop/reset真实取消库RAF；编辑/切页/后台/偏好改变均停止，清画布和旧编码，轮次隔离迟到回调。有限PNG编码8秒，错误清输出可重试；旧blob URL撤销。约0.45秒自动截静帧，也能主动截取；PNG为实际粒子画布+底色+祝福，不是动画文件。停止保留已经完成的同轮静帧，取消尚未完成编码。

同时使用系统prefers-reduced-motion检测和库disableForReducedMotion。减少动态时不调用动画，用自有有限60块静态色纸fallback生成PNG；这是无动态替代，不冒称它本身为库动画。运行中启用该偏好会立即停止。后台节流可能延迟定时器，保持前台使用；不承诺后台及时提醒。

## 真实验收

本机Edge10组一次通过，0未捕获异常、0外部请求。实际两个动画时刻画布非透明像素7882/7922、hash不同；真实PNG经Pillow独立打开960×640且全不透明，非底色15750/金色色纸3392像素。减少动态0新增库RAF且静态PNG非空；停止/自然结束/真实SPA卸载RAF清零；旧编码/URL、坏输入、PNG失败/8秒超时、组件缺失/加载超时恢复及390/1280均验证。原报告celebrate-browser-report.json，真实PNG animated-frame/reduced-motion/final-card与桌面/手机截图见外层outputs。未验证所有浏览器/OS后台调度、辅助技术人工或医学光敏安全；没有作此保证。
