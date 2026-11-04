# EasyTimer.js 本机生活计时器来源

审查日期：2026-11-04。DAILY-050，秒表/倒计时为同一项目的两个模式，只计一个来源；不是完整上游演示站点。仓库低频维护，不宣称近期活跃。

## 固定源码与实际制品

- 仓库：https://github.com/albert-gonzalez/easytimer.js
- 固定包：`easytimer.js@4.6.0`；tag `v4.6.0` 与npm gitHead同为 `7cc09eee8106fca60914c82bbfdc059d4bef5617`。
- 原包：https://registry.npmjs.org/easytimer.js/-/easytimer.js-4.6.0.tgz，npm SHA1 `43b4c5adf5597e96023a617545a977cd18506b04`。
- 实际浏览器使用原始 `dist/easytimer.js`（非压缩UMD，19,929字节），与固定Git提交dist文件逐字节相同，未修改或重新打包。
- UMD SHA256：`da2167af9e0ec8e4abb074fd95b12db6393a0669581a25d34f42f772c313e955`；其生成头标明2023-08-28 / Version4.6.0，原样保留。
- 只使用 `npm pack ... --ignore-scripts` 下载，不安装/构建，不改主package或锁。审计原包、README、package、固定源码/锁/许可证等留apps/web/.cache/easytimer-review，并备份外层outputs/timer-source-review。

## 完整分发许可与运行代码边界

`LICENSE.md` 为根MIT全文，Copyright (c) 2018 Albert González；与固定Git提交原LICENSE逐字节相同。

包无运行dependencies，计时/EventEmitter/计数器为上游自身代码。但UMD包含Babel构建时内联辅助函数（如objectSpread、defineProperty、typeof），不能只按“无dependencies”省略其版权。固定提交rollup配置为 `babelHelpers: bundled`，锁定 `@babel/helpers 7.22.11`；已保留Babel v7.22.11官方原MIT全文 `BABEL_HELPERS_LICENSE`，Copyright (c) 2014-present Sebastian McKenzie and other contributors。来源：https://raw.githubusercontent.com/babel/babel/v7.22.11/LICENSE 。这是内联辅助代码许可，不在产品中安装Babel编译器或其开发依赖。

尝试pack该辅助包遇npm网络ETIMEDOUT，因此直接读取官方同版本Git标签原始LICENSE补齐；没有把失败下载说成成功，也未执行该包脚本。UMD本身没有运行时导入外包。上游README中的jQuery示例以及开发依赖bootstrap/prism等未采用，页面仅系统字体/文字/CSS，无CDN、远程图片或字体。

已读取脚本：prestart会npm install，start会启动http-server 0.0.0.0:8001，test为mocha，build/build-examples/build-all为Rollup；全部未执行，未启动上游服务或申请后台权限。构建工具devDependencies不是本次浏览器许可闭包的附加运行包。

## 产品范围与真实计时

由原库setInterval/Date.now和secondTenthsUpdated事件驱动实际读数，不是CSS动画。秒表最多24小时，倒计时1秒至24小时，用户分钟0–1440/秒0–59且总量有界，拒绝小数/指数/表达式等。允许开始、暂停、继续、重置与20条手动记录；暂停/完成时生成实际TXT/JSON。继续、重置、模式/时长改变或新轮次会清旧下载；重置/模式改变还清本轮记录。

到零或秒表上限时钳制为0/24小时并停止，防后台延迟回调显示负数。卸载/重置移除全部库监听并stop清interval；旧回调还有实例/轮次检查。下载第二URL失败时内部捕获，撤销部分URL，保留暂停/结束状态，显示中文错误并可单独重试保存，不谎报成功。

组件加载8秒有界失败，可重试。检测到document.hidden会自动暂停，回前台手动继续；这不保证操作系统休眠/后台冻结期间能及时触发。库使用系统Date时钟，改系统时间会影响计时。0.1秒只是显示粒度，不是精度保证。不提供声音/系统通知/后台闹钟/唤醒锁，不申请任何相关权限，不保证离开、刷新或关闭后保活或保存。

## 验证证据边界

初轮7项真实计时/记录/边界通过，第8项把Next路由URL改变误作组件卸载，interval断言提前失败；原 `timer-browser-report.json` 含失败记录保留。验证器改为等待组件实际detached及被动清理结束后，剩余4项 `--lifecycle` 独立通过（timer-lifecycle-final-report.json）。第二URL故障 `--export-failure` 1项通过（timer-export-failure-report.json），0未捕获异常/外部请求。

实际秒表1.5秒对独立performance时间约1.554秒；实际2秒倒计时约2.073秒完成，本轮容差0.45秒。暂停读数不变，继续排除暂停时长，实际下载TXT/JSON独立读取；这些不是长期精度保证。24小时上限与过期回调仅通过显式模拟系统时钟跳变验证，未等待真实24小时。可见性事件模拟、SPA真实卸载、390/1280和依赖缺失/8秒超时恢复已验证；操作系统真实休眠/后台报警、跨所有浏览器及辅助技术人工测试未验。
