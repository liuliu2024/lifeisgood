# 基础网站验收记录

日期：2026-10-29。范围：本机中文门户、账号/权限、私有文件、收藏及站点基础草稿。89项候选均未接入，未调用真实模型、支付或第三方业务服务。

## 已执行

最新增量：站长配置版本冲突保护。后端完整56 passed（含独立三项并发/迁移/非法版本复核），Ruff src/tests通过；前端构建与类型检查通过。root在修后8000/3000执行8组基础及7组账号配置浏览器流程，全部通过、pageerror为0。两页同版本保存仅首个成功，后者409保留编辑；旧版本应用409且公开内容不变；显式重读后可保存/应用。测试最后恢复原公开三文本与独立草稿，版本正常递增不回拨。升级前已用SQLite backup保存本机忽略目录备份，未上传。下方40及5组为前一版本历史记录，不与新56和7组重复加总。

- 后端完整pytest：40 passed，Ruff src/tests通过。使用独立临时数据库和合成文件。
- 资源边界独立安全复验6项通过：匿名上传解析前拒绝、实际接收流上限与早停、缓冲关闭、Windows文件占用删除可重试、物理删除后数据库失败可恢复、会话轮换与来源拒绝。账号设置新增6项也经复跑通过，覆盖改密旧会话与并发旧登录拒绝、role不变、草稿/应用隔离、公开三字段和重启持久化。这些均属于完整40项的子集，不另加总。
- 前端Next构建及TypeScript通过。
- `npm run test:browser`：8组流程通过，浏览器pageerror为0。通过Next代理实际注册、普通用户站长接口403、私有multipart上传下载删除、游客下载401、收藏持久化、退出后私有接口401及任务真实空态。
- 1440/768/390三种宽度无横向溢出；手机关闭导航后的阴影遮挡已修，标题完整可见。详情Esc恢复、搜索和89候选数量检查通过。
- 后端修订后已重启；本机首页HTTP200，匿名account返回未登录，接口smoke在修后服务执行。
- `npm run test:account`：5组新增浏览器流程通过，包含密码确认不一致不发送请求、当前密码错不丢会话、成功撤销其他会话并清空密码字段、member发布403、保存不影响公开页、应用后公告纯文本无脚本执行、长文字390宽不溢出，测试后恢复原草稿和公开配置。

## 复验方法

```powershell
Set-Location apps/backend
$testScratch = Join-Path $env:LOCALAPPDATA 'lifeisgood-pytest'
.venv/Scripts/python.exe -m pytest -q --basetemp $testScratch --tb=short
.venv/Scripts/ruff.exe check src tests
Set-Location ../web
npm run build
npm run typecheck
# 先启动8000后端及3000前端，然后运行本机Edge/Chrome测试：
npm run test:browser
npm run test:account
```

Windows测试临时目录应较短且可写；长目录曾触发测试文件路径失败，不能当作权限测试成功。浏览器只访问localhost/127.0.0.1并使用合成资料，报告及截图在忽略的test-results中。

## 尚未验收

生产HTTPS/Secure Cookie/正式域名与代理、运营级限额/备份恢复、邮件验证/账号找回/注销、商户团队成员权限、真实任务执行与收费通道。站长初始化私有文件、运行数据库和上传文件不得提交。源码发布不表示公开部署或生产就绪。
