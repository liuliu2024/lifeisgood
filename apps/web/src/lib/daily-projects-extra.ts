import type { DailyProject } from "./daily-projects-core";

// Additions are separate from the original 35-project source-review snapshot.
// Root fills pinned sources only after review; executable acceptance is held elsewhere.
export const dailyProjectsExtra: DailyProject[] = [
  {
    "id": "DAILY-036",
    "title": "今天选什么，转一下",
    "description": "把自己的几个选项放到转盘，帮自己做个小决定。",
    "scene": "life",
    "repo": "https://github.com/buuing/lucky-canvas",
    "stars": 8784,
    "checkedAt": "2026-11-04",
    "commit": "7a8c0bbcb992a297b390e3a2ebaa1a3385c1f2f9",
    "license": "Apache-2.0；内嵌Microsoft辅助代码原声明保留",
    "chinese": "本平台中文操作；上游为转盘组件，非整套应用。",
    "maintenance": "仓库未归档；元数据最近推送2026-07-30；本次选择可固定匹配的1.7.26，不声称最新。",
    "limitations": [
      "2–20个文本选项，每项最多24字符；空项、控制字符及归一化重复项拒绝。",
      "使用浏览器普通伪随机，结果以实际停留回调与角度核对；非密码学公平证明，不提供奖品、金钱或营销开奖。",
      "文字与JSON仅在本机；选项编辑或离开清空本轮。"
    ],
    "status": "research",
    "input": "自己的文字选项，每行一项",
    "output": "可见转盘落点及选项/结果JSON",
    "integration": "本地浏览器独立iframe封装；计一个项目"
  },
  {
    "id": "DAILY-037",
    "title": "把CSV表格整理清楚",
    "description": "查看本机CSV行列，选择要保留的列，再保存CSV或JSON。",
    "scene": "life",
    "repo": "https://github.com/mholt/PapaParse",
    "stars": 13591,
    "checkedAt": "2026-11-04",
    "commit": "a4f8b0f1e30bf08e44da96ff5575ffdae7aa9b12",
    "license": "MIT",
    "chinese": "本平台中文表格整理；库本身没有独立产品界面。",
    "maintenance": "仓库未归档；元数据最近推送2026-10-27；实际制品固定5.5.3。",
    "limitations": [
      "仅UTF-8 CSV，不猜GBK；2MiB、10000行、100列、20万格、单格20000字符，预览20行。",
      "危险公式前缀导出CSV时加单引号，负号数值也可能作为文本；JSON保留原字符串与二维列位置。",
      "不是Excel全格式编辑或任意规模清洗；未核所有电子表格应用行为。"
    ],
    "status": "research",
    "input": "本机UTF-8 CSV及分隔符、保留列",
    "output": "预览与安全CSV、原字符串二维JSON",
    "integration": "本地解析，不使用网络Streamer或worker下载",
    "readmeUrl": "https://github.com/mholt/PapaParse/blob/a4f8b0f1e30bf08e44da96ff5575ffdae7aa9b12/README.md",
    "licenseUrl": "https://github.com/mholt/PapaParse/blob/a4f8b0f1e30bf08e44da96ff5575ffdae7aa9b12/LICENSE"
  },
  {
    "id": "DAILY-038",
    "title": "做一张清楚的条形码",
    "description": "输入商品或资料编号，预览并下载条形码SVG和PNG。",
    "scene": "life",
    "repo": "https://github.com/lindell/JsBarcode",
    "stars": 5897,
    "checkedAt": "2026-11-04",
    "commit": "6b7622c221efd54212edb2a5a77ce58f5825dec4",
    "license": "MIT",
    "chinese": "本平台中文参数与下载，上游为条形码库。",
    "maintenance": "仓库未归档；元数据最近推送2026-06-23；实际制品固定3.12.1。",
    "limitations": [
      "限定CODE128可打印ASCII和EAN13；EAN13支持12位补校验或13位核校验，不接受任意编码/中文数据。",
      "整数条宽、高度和长度有限额；浏览器实物PNG已用独立ZXing-C++回读，依赖仅验收不入站点。",
      "真机扫码、实际打印/扫描环境、商品编号注册不在本机工具已验范围。"
    ],
    "status": "research",
    "input": "明确编码类型与编号、整数尺寸",
    "output": "条形码SVG/PNG，可选人类可读文字",
    "integration": "浏览器本地编码与导出，无运行外部依赖",
    "readmeUrl": "https://github.com/lindell/JsBarcode/blob/6b7622c221efd54212edb2a5a77ce58f5825dec4/README.md",
    "licenseUrl": "https://github.com/lindell/JsBarcode/blob/6b7622c221efd54212edb2a5a77ce58f5825dec4/MIT-LICENSE.txt"
  }
];
