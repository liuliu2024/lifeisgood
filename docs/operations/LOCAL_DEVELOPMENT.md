# 本机开发与验证

适用Windows PowerShell，Python3.12、Node22以上。以下命令从仓库根目录运行；开发服务只绑定127.0.0.1。当前为本地邮箱密码账号、普通用户/站长、私有文件和收藏的开发底座；邮件验证、恢复/注销、团队成员管理与生产部署尚未实现。旧匿名图片/文档试验API独立保留，不继承为登录账号的数据。

## 本地站长初始化

在`apps/backend`中创建一次私有初始化文件，随后仅把内容加载到启动进程环境。密码不打印、不放聊天或Git；运行目录已忽略。示例邮箱仅供本机开发，可在首次启动前修改。

```powershell
Set-Location apps/backend
New-Item -ItemType Directory -Force runtime | Out-Null
if (-not (Test-Path -LiteralPath runtime/foundation-owner.json)) {
  $bootstrapPassword = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
  @{email='owner@lifeisgood.local';password=$bootstrapPassword} | ConvertTo-Json | Set-Content -Encoding utf8 -LiteralPath runtime/foundation-owner.json
}
$bootstrapOwner = Get-Content -Raw -LiteralPath runtime/foundation-owner.json | ConvertFrom-Json
$env:LIFE_OWNER_EMAIL=$bootstrapOwner.email
$env:LIFE_OWNER_PASSWORD=$bootstrapOwner.password
$env:LIFE_DATA_DIR='runtime/foundation-preview'
.venv/Scripts/python.exe -m uvicorn life_helper.main:app --host 127.0.0.1 --port 8000
```

登录时在本机私有文件中查看凭据。注册接口永远创建普通用户，已有普通账号不会因设置相同初始化邮箱而自动升为站长。三个站点文本配置为草稿，保存不会启用工具、模型或支付。`LIFE_ADMIN_TOKEN`仅属于旧试验API，当前门户不要求普通用户填写管理口令。

账号设置可用当前密码更改密码；成功后所有旧会话失效，当前设备获得新会话。初始化文件只用于首次建立站长，改密后不会在重启时恢复旧密码，请使用自行设置的新密码。站长设置先保存草稿，再点击“应用到网站”使三个公开文本字段生效；它不会启用任何工具或付费服务。

站长配置读取得到revision，保存与应用均须带expected_revision；旧客户端缺版本返回422，版本冲突返回409。前端保留编辑并提示显式“重新读取草稿”，重读会替换当前输入，请先复制需保留的内容。无保存草稿不能应用；公开配置仍只有三文本。数据库启动时幂等新增settings_revision元数据，保留旧草稿和已应用值。升级前以SQLite backup接口保存私有备份；回退须配套前后端和一致数据快照，不能删除版本元数据后继续接受旧请求。备份与运行数据均不得提交。

## 安装

```powershell
Set-Location apps/backend
uv sync --python 3.12 --cache-dir .cache/uv
Set-Location ../web
npm ci --ignore-scripts --cache .cache/npm
Set-Location ../..
```

已有Python时可给uv sync的--python传解释器路径。联网下载可能触发系统访问检查；不要因依赖未安装就报告验证通过。

## 启动

终端一：

```powershell
Set-Location apps/backend
.venv/Scripts/python.exe -m uvicorn life_helper.main:app --host 127.0.0.1 --port 8000
```

终端二：

```powershell
Set-Location apps/web
npm run dev
```

打开 http://127.0.0.1:3000 。生产构建预览使用npm run build后npm run start。不要同时修改.next目录并运行旧构建预览；重新构建后重启预览。

## 站长配置

后端启动前设置LIFE_ADMIN_TOKEN为至少24字符随机口令。可用以下命令只在该终端创建口令并写入本机忽略目录，避免打印到日志或提交Git：

```powershell
New-Item -ItemType Directory -Force runtime | Out-Null
$ownerToken = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
Set-Content -LiteralPath runtime/admin-token.txt -Value $ownerToken -NoNewline
$env:LIFE_ADMIN_TOKEN = $ownerToken
```

从本机文件读取口令后在站长配置中解锁。变量名引用（如TEXT_PROVIDER_API_KEY）和实际密钥值分开；页面只保存引用。当前API配置为草稿，不调用外部服务；切换到草稿会暂停该组件的本地/模拟执行，不能静默回退。

.env.example是变量清单，本切片不自动读取.env；请在启动后端的进程环境设置，或由部署系统注入。不要把生产密钥放入公开仓库或Notion。

## 验证

```powershell
Set-Location apps/backend
.venv/Scripts/python.exe -m pytest -q --basetemp .cache/pytest-local --tb=short
.venv/Scripts/ruff.exe check src tests
Set-Location ../web
npm run build
npm run typecheck
npm run test:browser
npm run test:account
npm run test:collections
```

浏览器测试需要两个服务运行及本机Chrome/Edge；可用CHROME_PATH指定浏览器。仅生成合成图片和测试文案，不使用真实客户数据。测试使用的浏览器profile会由Playwright管理。

当前Windows受限环境会阻止Python事件循环的本机socketpair，表现为TestClient挂起；已在允许本机连接的测试环境验证。使用可写的.cache作为临时目录，避免用户名编码引起的系统Temp错误。

## 旧图片/文档试验的历史边界

- 图片仅静态缩放、重编码与压缩，不是抠图；有损输出不保证每张更小。
- 图片10MB、2000万像素；输出宽度32–4096px，不放大；方向归正；清理元数据。
- 文档是明确标识的模板预览，未调用AI。
- 匿名空间cookie有效7天；没有正式登录、邀请、密码找回或跨设备同步。
- 图片在请求内同步完成；没有持久排队、恢复、幂等计费或生产预算系统。
- 没有支付、发票、真实用量结算或公网部署。
- API路由有站长口令保护，保存草稿而不执行任意网络端点；生产密钥管理仍待实施。
- Starlette当前测试兼容层提示httpx废弃警告；测试通过，后续单独评估httpx2迁移，未忽略失败。
