# SunCalc 本机日光时段来源

审查日期：2026-11-04。DAILY-047，仅本机近似太阳时段封装；不申请定位、不接地图/天气API，不是完整SunCalc.net网站。

## 固定源码与制品

- 仓库：https://github.com/mourner/suncalc
- npm `suncalc@1.9.0`，npm gitHead为 `6bc2757074c1e5eaa2389aa2ab36806f04c6d2a0`。实际浏览器运行的原始suncalc.js与该固定Git提交文件逐字节相同。
- 本轮查询v1.9.0标签得到另一个较早提交 `48d328f4b832a242539d8ee3bc955b06fdac5564`；不把标签和npm gitHead混为同一版本源码证据。本封装明确固定实际发布制品及其gitHead。
- 下载：https://registry.npmjs.org/suncalc/-/suncalc-1.9.0.tgz，`npm pack suncalc@1.9.0 --ignore-scripts`，不执行测试/发布脚本、不改主package/lock。
- npm tgz SHA1：`26212353fae61edb287c2d558fc4932ecf0e1532`。实际运行原字节SHA256：`5bfe4127cb91b7436295135d491e2d8abeccacbc8c4d450fb30771183b1e24d2`；许可证哈希见SHA256SUMS。
- 原tgz、README、package、固定源码与许可证及独立样本原响应保留在apps/web/.cache/suncalc-review，并备份外层outputs/daylight-source-review。README中的外链/徽章只作审查，不渲染为页面资源。

## 许可、依赖与脚本

BSD-2-Clause，原LICENSE完整保留：Copyright (c) 2014, Vladimir Agafonkin / All rights reserved。与固定Git提交LICENSE字节相同。suncalc.js原头部2011–2015 Vladimir Agafonkin版权也原样保留，未压缩或改bundle。

包无运行dependencies，浏览器脚本自包含，无其他运行包/字体/图片许可要引入。devDependencies仅eslint配置和tape，不采用。脚本pretest=eslint、test=node test.js、prepublishOnly=npm test；全部未执行。README将计算公式归于Astronomy Answers相关太阳/行星文章，原说明保留；采用的是有BSD-2许可的发布代码，不复制外站图片或文章。

## 独立样本（不是以SunCalc再算作参考）

从[美国海军天文台USNO单日数据服务](https://aa.usno.navy.mil/data/RS_OneDay)及其[官方API文档](https://aa.usno.navy.mil/data/api)读取，2026-11-04将公开GeoJSON原响应保存。仅研发验收时读取以下公共地理坐标，不在工具运行时发起请求或上传用户输入。

| 固定UTC样本 | 官方参考 |
| --- | --- |
| [Greenwich 2026-06-21，51.4779,0，tz=0](https://aa.usno.navy.mil/api/rstt/oneday?date=2026-06-21&coords=51.4779,0&tz=0) | 晨光02:55、日出03:43、过中天12:02、日落20:21、暮光21:09 UTC |
| [Tromsø 2026-06-21，69.6492,18.9553，tz=0](https://aa.usno.navy.mil/api/rstt/oneday?date=2026-06-21&coords=69.6492,18.9553&tz=0) | 太阳连续在地平线上方，无日出日落；过中天10:46 UTC |
| [Tromsø 2026-12-21，同坐标，tz=0](https://aa.usno.navy.mil/api/rstt/oneday?date=2026-12-21&coords=69.6492,18.9553&tz=0) | 太阳连续在地平线下，无日出日落；仍有民用晨光08:31、暮光12:53 UTC |

8个独立分钟样本点与实际下载UTC时间差43.245–86.120秒，均在本次验收容差180秒内；无日出状态与0/1440分钟日照也一致。这只是三个有界样本的验证，不是所有坐标/日期都保证3分钟精度。高纬度及季节转换可能误差更大。

## 封装语义与限制

手填十进制经纬度（±90/±180，6位小数）、公历日期2000–2099、固定UTC偏移-12:00至+14:00（15分钟一档）。不查询时区或夏令时规则，必须由用户填写所选日期的实际偏移。每次计算只检查5个邻近太阳周期，按所选本地00:00至次日00:00的固定24小时区间筛选事件；跨日光照拆成两段累加，UTC日期可为前/后一天。不存在的日出/日落不写成虚构00:00或Invalid Date。

高度固定0米、日出中心判定-0.833°、民用暮光-6°；不修正地形/建筑遮挡/海拔/天气或实际折射。极昼/极夜标签描述本24小时太阳相对判定线的近似状态；极夜仍可能有暮光，过中天不代表太阳可见。导出UTC秒仅为复核方便，不承诺秒级精度、天气/摄影效果或安全导航用途。

显示输入/结果均为文本与CSS时段条。只提供本机TXT/JSON，不加载任何远程资源。编辑/坏输入/重算清旧结果并撤销blob URL；计算为固定5周期的有限同步数学过程，无异步旧计算。组件加载8秒有界失败并可重试，卸载阻止旧加载回调。
