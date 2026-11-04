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
  },
  {
    "id": "DAILY-039",
    "title": "做个清楚的二维码",
    "description": "把文字或网址生成二维码，下载PNG或SVG。",
    "scene": "life",
    "repo": "https://github.com/soldair/node-qrcode",
    "stars": 8182,
    "checkedAt": "2026-11-04",
    "commit": "3848ed2c17de5bcdead487417dbf14c5dd017f8d",
    "license": "MIT（qrcode与浏览器依赖dijkstrajs1.0.3原文）",
    "chinese": "本平台中文输入、密度提示及下载，非上游完整应用。",
    "maintenance": "仓库未归档；最近推送2024-08-23，选用成熟固定版1.5.4，不声称最新活跃。",
    "limitations": [
      "最多1200 UTF-8字节、版本≤27、每模块≥4px；只黑白、有限输出尺寸及留白。过密明确拒绝，不保证任何长度都能扫。",
      "ECI支持和部分扫码器Unicode解释仍有边界；当前PNG和SVG已用独立工具回读，真机/打印未验。",
      "不会访问编码内容里的网址；旧高密度失败保留，未冒称修复上游所有情况。"
    ],
    "status": "research",
    "input": "自己的文字或网址与有限纠错/尺寸参数",
    "output": "二维码PNG/SVG及尺寸密度提示",
    "integration": "本机浏览器28模块固定打包，非运行下载依赖"
  },
  {
    "id": "DAILY-040",
    "title": "把PDF合起来或取出几页",
    "description": "按原页合并PDF或保留指定页，保存新的文件。",
    "scene": "life",
    "repo": "https://github.com/Hopding/pdf-lib",
    "stars": 8667,
    "checkedAt": "2026-11-04",
    "commit": "4beebbef7a261ed0be089bb1d63a5b6e28cc488a",
    "license": "MIT；附带MIT/Apache-2.0/Zlib/0BSD及Adobe字体度量声明分别保留",
    "chinese": "本平台中文两份合并/按序取页及新窗口预览。",
    "maintenance": "仓库未归档；最近推送2024-07-17，固定1.17.1，不冒称近期活跃。",
    "limitations": [
      "每个输入≤20MiB/200页，两输入≤40MiB；输出≤400页/60MiB。输出容量失败防线为受控模拟，非大文件压力测试。",
      "仅原页合并/按序重复取页；没有OCR、新中文排字、加密PDF或所有表单/签名兼容承诺。",
      "原页/结果使用浏览器原生新窗口预览，未保留不可靠的窄内嵌框；Edge中文已看，其他浏览器与全部PDF未验。",
      "字体度量和版权说明不等于分发字体程序，测试字体与样本未发布。"
    ],
    "status": "research",
    "input": "本机PDF、模式及有界页码序列",
    "output": "合并/取页PDF、新窗口原页与结果预览",
    "integration": "纯浏览器原页处理，不上传、不新装字体/模型"
  },
  {
    "id": "DAILY-041",
    "title": "把数字画成一张图",
    "description": "输入自己的数据，预览清楚的图表并保存PNG。",
    "scene": "life",
    "repo": "https://github.com/chartjs/Chart.js",
    "stars": 67776,
    "checkedAt": "2026-11-04",
    "commit": "9c5cf9fac7ec04a71b516e2aff3f7d76876be369",
    "license": "MIT（Chart.js与内嵌@kurkle/color0.3.2完整原文）",
    "chinese": "平台中文数字列表、图类型、预览和PNG下载。",
    "maintenance": "仓库未归档；最近推送2026-10-23；固定运行4.5.1。",
    "limitations": [
      "2–12行，标签12 Unicode字符/标题40字符/总数据2000字符；普通十进制±10亿、最多6位小数。",
      "圆环不接受负数或全零；拒绝公式、千分位、科学计数法和歧义输入，按用户给的顺序作图。",
      "仅1200×800或960×960 PNG；系统字体，屏幕配色，不做印刷色彩认证或自动商业分析。"
    ],
    "status": "research",
    "input": "自己的标题、标签数值及柱/线/圆环类型",
    "output": "当前数据图预览与真实PNG",
    "integration": "本地UMD与颜色依赖，无远程资源"
  }
];
