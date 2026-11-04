export type DailyProject = {
  id: string;
  title: string;
  description: string;
  scene: "life" | "creative";
  repo: string;
  stars: number | null;
  checkedAt: string;
  commit: string;
  license: string;
  chinese: string;
  maintenance: string;
  limitations: string[];
  status: "available" | "research";
  toolPath?: string;
  input?: string;
  output?: string;
  integration?: string;
  readmeUrl?: string;
  licenseUrl?: string;
};

// Source-review snapshot, not a claim of installation or acceptance.
// The root integration layer may mark only actually verified routes as available.
export const dailyProjectsCore: DailyProject[] = [
  {
    "id": "DAILY-001",
    "title": "做一个专属几何头像",
    "description": "用昵称生成可保存的几何图案头像。",
    "scene": "creative",
    "repo": "https://github.com/dmester/jdenticon",
    "stars": 1754,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "c894f54c50b1ee07754d09c2b7edabea0f1c9351",
    "license": "MIT",
    "chinese": "上游是无独立界面的库；平台中文封装另行验收。",
    "maintenance": "未归档；最近推送 2024-05-10T09:59:32Z；低频/较久未更新，维护风险另评",
    "limitations": [
      "不是人像生成或身份校验。",
      "同样输入生成同样图案，不适合当作保密信息；历史较低频更新。"
    ],
    "status": "research",
    "toolPath": "/tools/avatar",
    "input": "昵称或自定义短文字",
    "output": "几何头像SVG/PNG",
    "integration": "低：浏览器库，无模型API",
    "readmeUrl": "https://github.com/dmester/jdenticon/blob/c894f54c50b1ee07754d09c2b7edabea0f1c9351/README.md",
    "licenseUrl": "https://github.com/dmester/jdenticon/blob/c894f54c50b1ee07754d09c2b7edabea0f1c9351/LICENSE"
  },
  {
    "id": "DAILY-002",
    "title": "从照片提取好看的配色",
    "description": "从自己的照片中找主色和配色灵感。",
    "scene": "creative",
    "repo": "https://github.com/lokesh/color-thief",
    "stars": 13663,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "a19bce8570322ca619df1f3cae6e0d6efd446639",
    "license": "MIT",
    "chinese": "上游是库；平台中文操作界面另行验收。",
    "maintenance": "未归档；最近推送 2026-08-03T06:06:03Z",
    "limitations": [
      "上游当前README为新版getColorSync/getPaletteSync，版本API不能混用。",
      "只处理自己选择的文件；远程图片跨域、透明图和大图需专项验证。"
    ],
    "status": "research",
    "toolPath": "/tools/palette",
    "input": "用户选择的图片",
    "output": "主色及多色调色板",
    "integration": "低：浏览器库；需处理图片像素/内存限制",
    "readmeUrl": "https://github.com/lokesh/color-thief/blob/a19bce8570322ca619df1f3cae6e0d6efd446639/README.md",
    "licenseUrl": "https://github.com/lokesh/color-thief/blob/a19bce8570322ca619df1f3cae6e0d6efd446639/LICENSE"
  },
  {
    "id": "DAILY-003",
    "title": "把照片裁成想要的比例",
    "description": "为头像、相册或分享图裁剪合适画面。",
    "scene": "life",
    "repo": "https://github.com/fengyuanchen/cropperjs",
    "stars": 13911,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "d671590f32aa655eba87069b61b1e22ff0a2fb63",
    "license": "MIT",
    "chinese": "库本身不带完整中文产品界面，需平台封装。",
    "maintenance": "未归档；最近推送 2026-10-16T12:48:33Z",
    "limitations": [
      "不同主版本API差异较大，运行版本必须另锁。",
      "需自己提供下载、失效结果清除、图片大小限制和手机触控验收。"
    ],
    "status": "research",
    "toolPath": "/tools/crop",
    "input": "本机图片与裁剪框/比例",
    "output": "裁剪结果图片",
    "integration": "低：浏览器裁剪组件，需中文外壳和导出",
    "readmeUrl": "https://github.com/fengyuanchen/cropperjs/blob/d671590f32aa655eba87069b61b1e22ff0a2fb63/README.md",
    "licenseUrl": "https://github.com/fengyuanchen/cropperjs/blob/d671590f32aa655eba87069b61b1e22ff0a2fb63/LICENSE"
  },
  {
    "id": "DAILY-004",
    "title": "让照片变小一点",
    "description": "压缩照片，方便保存和分享。",
    "scene": "life",
    "repo": "https://github.com/Donaldcwl/browser-image-compression",
    "stars": 1723,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "d933bc8e483a9853ed2b57338e035e8c45e40dc7",
    "license": "MIT",
    "chinese": "库没有独立中文界面；平台封装另行验收。",
    "maintenance": "未归档；最近推送 2024-03-08T18:16:16Z；低频/较久未更新，维护风险另评",
    "limitations": [
      "README中的Worker默认libURL指向jsDelivr；接入时必须配置本地资源或禁用Worker。",
      "压缩有质量损失，目标体积不保证总能达到；大图/低内存需限制。"
    ],
    "status": "research",
    "toolPath": "/tools/compress",
    "input": "本机图片及体积/尺寸选项",
    "output": "压缩图片",
    "integration": "低：浏览器库，需本地Worker与资源限制",
    "readmeUrl": "https://github.com/Donaldcwl/browser-image-compression/blob/d933bc8e483a9853ed2b57338e035e8c45e40dc7/README.md",
    "licenseUrl": "https://github.com/Donaldcwl/browser-image-compression/blob/d933bc8e483a9853ed2b57338e035e8c45e40dc7/LICENSE"
  },
  {
    "id": "DAILY-005",
    "title": "把几份文件打成一个包",
    "description": "选中零散文件，打包后一次下载。",
    "scene": "life",
    "repo": "https://github.com/Stuk/jszip",
    "stars": 10394,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "609d95f4098a11507160cd101e0b181cfad6a582",
    "license": "MIT OR GPL-3.0（根文本双许可，可选MIT）",
    "chinese": "无独立界面；中文文件名和平台中文操作需实测。",
    "maintenance": "未归档；最近推送 2026-09-09T17:13:04Z",
    "limitations": [
      "根LICENSE明确可选择MIT或GPLv3；本平台应记录所用许可及依赖声明。",
      "不直接扫描电脑目录，不自动覆盖原文件；解包需要防路径穿越与压缩炸弹，不能和打包混称已实现。"
    ],
    "status": "research",
    "toolPath": "/tools/zip",
    "input": "用户主动选择的多个文件",
    "output": "ZIP压缩包",
    "integration": "低：浏览器库；打包与解包要分别限制",
    "readmeUrl": "https://github.com/Stuk/jszip/blob/609d95f4098a11507160cd101e0b181cfad6a582/README.markdown",
    "licenseUrl": "https://github.com/Stuk/jszip/blob/609d95f4098a11507160cd101e0b181cfad6a582/LICENSE.markdown"
  },
  {
    "id": "DAILY-006",
    "title": "把笔记排版得清楚一点",
    "description": "边写简单标记边看排版后的笔记。",
    "scene": "life",
    "repo": "https://github.com/markdown-it/markdown-it",
    "stars": 22027,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "a8c00d474ec9b304fad9b71c16d6fa8b4909279e",
    "license": "MIT",
    "chinese": "解析中文文本不等于自带中文编辑器；平台界面另行验收。",
    "maintenance": "未归档；最近推送 2026-10-23T18:32:33Z",
    "limitations": [
      "不含完整富文本编辑器、账号同步或云盘。",
      "原始HTML、链接协议、插件与导出内容要做安全限制；不默认启用远程图片/插件。"
    ],
    "status": "research",
    "toolPath": "/tools/notes",
    "input": "Markdown文字",
    "output": "排版预览和可下载文档",
    "integration": "低：解析库；需安全预览、编辑与导出壳",
    "readmeUrl": "https://github.com/markdown-it/markdown-it/blob/a8c00d474ec9b304fad9b71c16d6fa8b4909279e/README.md",
    "licenseUrl": "https://github.com/markdown-it/markdown-it/blob/a8c00d474ec9b304fad9b71c16d6fa8b4909279e/LICENSE"
  },
  {
    "id": "DAILY-007",
    "title": "随手画一张手绘风草图",
    "description": "画个布置图、流程或灵感小草图。",
    "scene": "creative",
    "repo": "https://github.com/excalidraw/excalidraw",
    "stars": 135100,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "dd2f8fc32b92cbf56f4abee6a0cf3b14681b4b55",
    "license": "MIT",
    "chinese": "固定源码有packages/excalidraw/locales/zh-CN.json；翻译与字体仍需实测。",
    "maintenance": "未归档；最近推送 2026-11-03T15:21:44Z",
    "limitations": [
      "本地画板与在线多人协作是不同接入范围。",
      "字体/图标库/外链和协作服务分别审，不能把官方托管功能全部算进组件。"
    ],
    "status": "research",
    "input": "手绘图形、文字与自有图片",
    "output": "画布工程、SVG或PNG",
    "integration": "中：嵌入组件较大，协作需额外服务",
    "readmeUrl": "https://github.com/excalidraw/excalidraw/blob/dd2f8fc32b92cbf56f4abee6a0cf3b14681b4b55/README.md",
    "licenseUrl": "https://github.com/excalidraw/excalidraw/blob/dd2f8fc32b92cbf56f4abee6a0cf3b14681b4b55/LICENSE"
  },
  {
    "id": "DAILY-008",
    "title": "记住家里还有什么",
    "description": "管理食材、保质期和购物清单。",
    "scene": "life",
    "repo": "https://github.com/grocy/grocy",
    "stars": 9648,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "41206cb90154e0d17d3e108cc1f182b94fdb465d",
    "license": "MIT",
    "chinese": "README确认可本地化；本轮中文文件读取未成功，中文完整度待确认。",
    "maintenance": "未归档；最近推送 2026-09-16T20:14:38Z",
    "limitations": [
      "需独立账号/存储与备份，不是直接复制前端即可用。",
      "扫码摄像头受浏览器安全上下文限制；条码库/通知等外部能力另配。"
    ],
    "status": "research",
    "input": "家庭物品、数量、到期日期",
    "output": "库存、到期提醒与购物清单",
    "integration": "高：PHP后端/数据库/账号隔离",
    "readmeUrl": "https://github.com/grocy/grocy/blob/41206cb90154e0d17d3e108cc1f182b94fdb465d/README.md",
    "licenseUrl": "https://github.com/grocy/grocy/blob/41206cb90154e0d17d3e108cc1f182b94fdb465d/LICENSE.md"
  },
  {
    "id": "DAILY-009",
    "title": "把家常菜和一周菜单存起来",
    "description": "收藏食谱，安排菜单并整理采购食材。",
    "scene": "life",
    "repo": "https://github.com/mealie-recipes/mealie",
    "stars": 13795,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "d4d6f71352786dc7afde88fda73ccadfd6c68f52",
    "license": "AGPL-3.0",
    "chinese": "README称有35+语言；本轮未读到具体中文文件，中文覆盖待确认。",
    "maintenance": "未归档；最近推送 2026-11-03T12:31:29Z",
    "limitations": [
      "网页食谱抓取受来源版权与网站访问条件限制。",
      "第三方应用/API与可选AI不自动启用；AGPL核心与具体依赖分开核。"
    ],
    "status": "research",
    "input": "食谱文字/授权链接及菜单安排",
    "output": "食谱库、菜单与购物清单",
    "integration": "高：服务端API、数据库和家庭账号",
    "readmeUrl": "https://github.com/mealie-recipes/mealie/blob/d4d6f71352786dc7afde88fda73ccadfd6c68f52/README.md",
    "licenseUrl": "https://github.com/mealie-recipes/mealie/blob/d4d6f71352786dc7afde88fda73ccadfd6c68f52/LICENSE"
  },
  {
    "id": "DAILY-010",
    "title": "把复杂事情画成一张图",
    "description": "整理搬家、活动或家庭事项的流程。",
    "scene": "creative",
    "repo": "https://github.com/jgraph/drawio",
    "stars": 9159,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "3e707fd20b6930778d6f6bf6e4d0079b4bce366b",
    "license": "Apache-2.0",
    "chinese": "固定源码src/main/webapp/resources/dia_zh.txt已读到中文翻译。",
    "maintenance": "未归档；最近推送 2026-10-30T21:28:34Z",
    "limitations": [
      "库中第三方图标与字体声明必须保留。",
      "云盘、协作、服务端PDF导出并非普通浏览器自动具备。"
    ],
    "status": "research",
    "input": "图形、连接线和文字",
    "output": "图表工程、SVG/PNG/PDF等候选输出",
    "integration": "中：可自托管网页，需导出和存储适配",
    "readmeUrl": "https://github.com/jgraph/drawio/blob/3e707fd20b6930778d6f6bf6e4d0079b4bce366b/README.md",
    "licenseUrl": "https://github.com/jgraph/drawio/blob/3e707fd20b6930778d6f6bf6e4d0079b4bce366b/LICENSE"
  },
  {
    "id": "DAILY-011",
    "title": "设计邀请卡和页面草稿",
    "description": "用画布安排图片、文字和界面构想。",
    "scene": "creative",
    "repo": "https://github.com/penpot/penpot",
    "stars": 62021,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "51cbae6ea5b265bbfde7ad249e8a09dc85bdd359",
    "license": "MPL-2.0",
    "chinese": "固定源码frontend/translations/zh_CN.po已核，翻译完成度待体验验证。",
    "maintenance": "未归档；最近推送 2026-11-03T17:02:38Z",
    "limitations": [
      "MPL核心、模板/字体/素材和企业/托管服务分开核。",
      "需要账号、对象存储与后台资源，未部署不称可运行。"
    ],
    "status": "research",
    "input": "自有图片、文字、形状与版式",
    "output": "设计工程、SVG及图片导出",
    "integration": "高：多服务自托管；完整设计工具",
    "readmeUrl": "https://github.com/penpot/penpot/blob/51cbae6ea5b265bbfde7ad249e8a09dc85bdd359/README.md",
    "licenseUrl": "https://github.com/penpot/penpot/blob/51cbae6ea5b265bbfde7ad249e8a09dc85bdd359/LICENSE"
  },
  {
    "id": "DAILY-012",
    "title": "画一个可缩放的小图标",
    "description": "在网页里编辑简单矢量图和装饰图案。",
    "scene": "creative",
    "repo": "https://github.com/SVG-Edit/svgedit",
    "stars": 7894,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "c44f061d2f9a626d2771cc931298af5a45522d87",
    "license": "MIT",
    "chinese": "本轮中文界面来源未确认，可做中文封装；不宣称原生中文完整。",
    "maintenance": "未归档；最近推送 2026-08-05T17:53:30Z",
    "limitations": [
      "根MIT之外有licenseInfo.json，扩展/第三方图形需逐项核。",
      "导入SVG必须隔离或清理脚本/外链，不把任意SVG直接插入主站DOM。"
    ],
    "status": "research",
    "input": "形状、路径、文字或自有SVG",
    "output": "SVG及图片导出候选",
    "integration": "中：网页应用/画布包，需简化中文入口",
    "readmeUrl": "https://github.com/SVG-Edit/svgedit/blob/c44f061d2f9a626d2771cc931298af5a45522d87/README.md",
    "licenseUrl": "https://github.com/SVG-Edit/svgedit/blob/c44f061d2f9a626d2771cc931298af5a45522d87/LICENSE-MIT.txt"
  },
  {
    "id": "DAILY-013",
    "title": "给分享照片省一点空间",
    "description": "在浏览器里调整照片体积和质量。",
    "scene": "life",
    "repo": "https://github.com/fengyuanchen/compressorjs",
    "stars": 5783,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "fc37559aa582d7734a5f720dcec5032989e2d3ba",
    "license": "MIT",
    "chinese": "上游为库，平台中文封装待验证。",
    "maintenance": "未归档；最近推送 2026-10-01T04:54:14Z",
    "limitations": [
      "与已选browser-image-compression属于备选方案，不另算一个已交付功能。",
      "README说明为有损压缩且浏览器结果不同；超大图要限尺寸。"
    ],
    "status": "research",
    "input": "本机图片与质量/尺寸参数",
    "output": "重新编码图片",
    "integration": "低：浏览器库；是压缩方案备选",
    "readmeUrl": "https://github.com/fengyuanchen/compressorjs/blob/fc37559aa582d7734a5f720dcec5032989e2d3ba/README.md",
    "licenseUrl": "https://github.com/fengyuanchen/compressorjs/blob/fc37559aa582d7734a5f720dcec5032989e2d3ba/LICENSE"
  },
  {
    "id": "DAILY-014",
    "title": "把一组照片放大慢慢看",
    "description": "在网页相册里放大、旋转和逐张浏览。",
    "scene": "life",
    "repo": "https://github.com/fengyuanchen/viewerjs",
    "stars": 8245,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "b6ddf87b94b9e466409aa955e2991f99a84c5d7c",
    "license": "MIT",
    "chinese": "上游为浏览器组件；中文按钮/辅助标签需封装。",
    "maintenance": "未归档；最近推送 2026-10-16T12:13:48Z",
    "limitations": [
      "这是图片查看器，不是照片编辑、分类或人脸识别。",
      "图片来源权限、公开分享和后台存储不是该库自动提供。"
    ],
    "status": "research",
    "input": "用户选择或已授权的照片列表",
    "output": "可交互图片浏览",
    "integration": "低至中：查看器库，存储另做",
    "readmeUrl": "https://github.com/fengyuanchen/viewerjs/blob/b6ddf87b94b9e466409aa955e2991f99a84c5d7c/README.md",
    "licenseUrl": "https://github.com/fengyuanchen/viewerjs/blob/b6ddf87b94b9e466409aa955e2991f99a84c5d7c/LICENSE"
  },
  {
    "id": "DAILY-015",
    "title": "把照片缩成清晰的小图",
    "description": "为相册或分享生成合适尺寸的图片。",
    "scene": "life",
    "repo": "https://github.com/nodeca/pica",
    "stars": 4154,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "f897666f18e9daeff540fe03d2708ba74214a046",
    "license": "MIT",
    "chinese": "无独立中文界面，平台封装。",
    "maintenance": "未归档；最近推送 2026-08-15T12:29:51Z",
    "limitations": [
      "不是无损超分辨率或AI修复。",
      "与压缩/裁剪不同，但仍需实际验证大图、浏览器内存和导出格式。"
    ],
    "status": "research",
    "input": "本机图片和目标尺寸",
    "output": "重采样缩略图",
    "integration": "低：浏览器图像重采样库",
    "readmeUrl": "https://github.com/nodeca/pica/blob/f897666f18e9daeff540fe03d2708ba74214a046/README.md",
    "licenseUrl": "https://github.com/nodeca/pica/blob/f897666f18e9daeff540fe03d2708ba74214a046/LICENSE"
  },
  {
    "id": "DAILY-016",
    "title": "对比不同图片格式和体积",
    "description": "一边看画质，一边选更合适的图片格式。",
    "scene": "life",
    "repo": "https://github.com/GoogleChromeLabs/squoosh",
    "stars": 26123,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "e8d35e0fb66eb16eff6fe8fc773eabcbb7128de3",
    "license": "Apache-2.0",
    "chinese": "本轮中文UI未确认，需要平台中文入口。",
    "maintenance": "未归档；最近推送 2026-10-22T17:16:21Z",
    "limitations": [
      "README明确图像本地处理但使用Google Analytics，接入需禁统计并核网络请求。",
      "编码器/WASM/依赖许可分别核，根Apache不等于全部资源。"
    ],
    "status": "research",
    "input": "自有图片与编码参数",
    "output": "压缩/转换图片及对比预览",
    "integration": "中：网页应用加WASM编码器",
    "readmeUrl": "https://github.com/GoogleChromeLabs/squoosh/blob/e8d35e0fb66eb16eff6fe8fc773eabcbb7128de3/README.md",
    "licenseUrl": "https://github.com/GoogleChromeLabs/squoosh/blob/e8d35e0fb66eb16eff6fe8fc773eabcbb7128de3/LICENSE"
  },
  {
    "id": "DAILY-017",
    "title": "让文字和背景更容易看清",
    "description": "调整颜色，寻找更易读的文字与背景组合。",
    "scene": "creative",
    "repo": "https://github.com/bgrins/TinyColor",
    "stars": 5253,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "b49018c9f2dbca313d80d7a4dad25e26143cfe01",
    "license": "MIT",
    "chinese": "无独立界面；中文说明由平台提供。",
    "maintenance": "未归档；最近推送 2024-06-26T15:48:44Z；低频/较久未更新，维护风险另评",
    "limitations": [
      "旧库最近推送2024，维护频率低，需锁定和评估。",
      "对比度计算不等于整页无障碍验收，也不替用户判断所有视觉情况。"
    ],
    "status": "research",
    "input": "颜色值或配色参数",
    "output": "颜色转换、组合及可读性指标",
    "integration": "低：颜色计算库",
    "readmeUrl": "https://github.com/bgrins/TinyColor/blob/b49018c9f2dbca313d80d7a4dad25e26143cfe01/README.md",
    "licenseUrl": "https://github.com/bgrins/TinyColor/blob/b49018c9f2dbca313d80d7a4dad25e26143cfe01/LICENSE"
  },
  {
    "id": "DAILY-018",
    "title": "做一组自然的渐变配色",
    "description": "从几个喜欢的颜色生成过渡和配色。",
    "scene": "creative",
    "repo": "https://github.com/gka/chroma.js",
    "stars": 10606,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "c6f893a6e3bb83b3b03d397ceffd326cf818cd02",
    "license": "BSD-3-Clause；ColorBrewer部分Apache-2.0",
    "chinese": "无独立中文界面，可中文封装。",
    "maintenance": "未归档；最近推送 2026-10-24T22:55:15Z",
    "limitations": [
      "主代码BSD-3-Clause，根LICENSE另含ColorBrewer Apache-2.0说明。",
      "不是照片滤镜编辑器；展示和导出功能仍需开发。"
    ],
    "status": "research",
    "input": "颜色和渐变/色阶参数",
    "output": "色阶与配色值",
    "integration": "低：颜色运算库，需中文UI",
    "readmeUrl": "https://github.com/gka/chroma.js/blob/c6f893a6e3bb83b3b03d397ceffd326cf818cd02/readme.md",
    "licenseUrl": "https://github.com/gka/chroma.js/blob/c6f893a6e3bb83b3b03d397ceffd326cf818cd02/LICENSE"
  },
  {
    "id": "DAILY-019",
    "title": "做一个可拖动的小画布",
    "description": "组合照片、贴纸和文字，制作简单创意图。",
    "scene": "creative",
    "repo": "https://github.com/konvajs/konva",
    "stars": 14910,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "f07eb7104bda2b38b6c50804acac43ab59e17448",
    "license": "MIT（根文本确认）",
    "chinese": "无完整产品界面，需开发中文画布工具。",
    "maintenance": "未归档；最近推送 2026-10-31T18:27:00Z",
    "limitations": [
      "渲染引擎不能直接当作完整PS；撤销、图层、导出都要实现。",
      "字体/图片/贴纸素材需自备或单独开源核查。"
    ],
    "status": "research",
    "input": "自有图片、形状和文字",
    "output": "可编辑画布及导出图片",
    "integration": "中：绘图引擎，不是现成编辑器",
    "readmeUrl": "https://github.com/konvajs/konva/blob/f07eb7104bda2b38b6c50804acac43ab59e17448/README.md",
    "licenseUrl": "https://github.com/konvajs/konva/blob/f07eb7104bda2b38b6c50804acac43ab59e17448/LICENSE"
  },
  {
    "id": "DAILY-020",
    "title": "用简单文字画出关系图",
    "description": "把步骤和关系写下来，自动排成图。",
    "scene": "creative",
    "repo": "https://github.com/hikerpig/pintora",
    "stars": 1281,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "695eb2ed22460bd083808b88b3fdd8fbd03c02df",
    "license": "MIT",
    "chinese": "README/文档有中文入口；中文字体与换行待浏览器实测。",
    "maintenance": "未归档；最近推送 2026-11-03T02:37:32Z",
    "limitations": [
      "需要限定图表语法和错误提示，不是自然语言AI作图。",
      "导入文本长度、外链与字体需要限制。"
    ],
    "status": "research",
    "input": "受支持的图表语法和文字",
    "output": "SVG或Canvas图表",
    "integration": "低至中：浏览器/Node图表库",
    "readmeUrl": "https://github.com/hikerpig/pintora/blob/695eb2ed22460bd083808b88b3fdd8fbd03c02df/README.md",
    "licenseUrl": "https://github.com/hikerpig/pintora/blob/695eb2ed22460bd083808b88b3fdd8fbd03c02df/LICENSE.txt"
  },
  {
    "id": "DAILY-021",
    "title": "把笔记变成思维导图",
    "description": "用标题层级整理想法，展开成一张图。",
    "scene": "creative",
    "repo": "https://github.com/markmap/markmap",
    "stars": 13216,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "122bf0500ee7aca4f023c2465f7e26bf023eec52",
    "license": "MIT",
    "chinese": "上游界面中文覆盖未确认；中文文本排版需实测。",
    "maintenance": "未归档；最近推送 2026-09-12T02:47:33Z",
    "limitations": [
      "不是自动总结或AI理解，只把结构化笔记可视化。",
      "脚本/外链、动态资源加载和导出需由平台限制。"
    ],
    "status": "research",
    "input": "Markdown标题和列表",
    "output": "交互式思维导图",
    "integration": "低至中：浏览器库，需编辑/保存壳",
    "readmeUrl": "https://github.com/markmap/markmap/blob/122bf0500ee7aca4f023c2465f7e26bf023eec52/README.md",
    "licenseUrl": "https://github.com/markmap/markmap/blob/122bf0500ee7aca4f023c2465f7e26bf023eec52/LICENSE"
  },
  {
    "id": "DAILY-022",
    "title": "整理一张自己的思绪导图",
    "description": "把旅行、学习或活动计划分成清楚的分支。",
    "scene": "creative",
    "repo": "https://github.com/wanglin2/mind-map",
    "stars": 12912,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "e8e5ef9c41bc13ca7b13084e078123adff002242",
    "license": "MIT",
    "chinese": "固定README明确简体/繁体中文等语言支持，仍需核选用模块。",
    "maintenance": "未归档；最近推送 2026-08-02T07:54:19Z",
    "limitations": [
      "库、示例、插件与付费服务不能混为同一开源范围。",
      "图片/字体和导出依赖分别核，账号协作另做。"
    ],
    "status": "research",
    "input": "思维节点、图片、连线",
    "output": "可编辑导图及导出候选",
    "integration": "中：完整Web示例及导图库",
    "readmeUrl": "https://github.com/wanglin2/mind-map/blob/e8e5ef9c41bc13ca7b13084e078123adff002242/README.md",
    "licenseUrl": "https://github.com/wanglin2/mind-map/blob/e8e5ef9c41bc13ca7b13084e078123adff002242/LICENSE"
  },
  {
    "id": "DAILY-023",
    "title": "和家人朋友一起写一份清单",
    "description": "共同整理活动笔记、旅行安排或会议记录。",
    "scene": "life",
    "repo": "https://github.com/hedgedoc/hedgedoc",
    "stars": 7502,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "f2ff89befccc2686b2bdf266af604b7de5a0c619",
    "license": "AGPL-3.0",
    "chinese": "本轮中文UI文件未核，需确认/封装。",
    "maintenance": "未归档；最近推送 2026-11-03T16:39:54Z",
    "limitations": [
      "代码AGPL，README另标CC-BY-SA-4.0文档，声明分开保留。",
      "公开分享、协作权限与第三方登录要独立配置，不默认开放匿名编辑。"
    ],
    "status": "research",
    "input": "Markdown笔记与协作编辑",
    "output": "可保存/分享的文档",
    "integration": "高：协作服务/数据库/账号",
    "readmeUrl": "https://github.com/hedgedoc/hedgedoc/blob/f2ff89befccc2686b2bdf266af604b7de5a0c619/README.md",
    "licenseUrl": "https://github.com/hedgedoc/hedgedoc/blob/f2ff89befccc2686b2bdf266af604b7de5a0c619/LICENSE"
  },
  {
    "id": "DAILY-024",
    "title": "把草稿整理成排版笔记",
    "description": "写下文字，实时查看Markdown排版。",
    "scene": "life",
    "repo": "https://github.com/joemccann/dillinger",
    "stars": 8296,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "17010b79c18553cf9c1757c297e128f9b950c9be",
    "license": "MIT",
    "chinese": "本轮中文界面未核，需中文封装。",
    "maintenance": "未归档；最近推送 2026-06-21T18:06:55Z",
    "limitations": [
      "本地编辑和Google Drive等云盘授权是不同范围。",
      "禁用未配置的云服务与远程内容，导出格式仍需实测。"
    ],
    "status": "research",
    "input": "Markdown文字或文档",
    "output": "预览与导出候选",
    "integration": "中：网页编辑器，云盘集成可关闭",
    "readmeUrl": "https://github.com/joemccann/dillinger/blob/17010b79c18553cf9c1757c297e128f9b950c9be/README.md",
    "licenseUrl": "https://github.com/joemccann/dillinger/blob/17010b79c18553cf9c1757c297e128f9b950c9be/LICENSE"
  },
  {
    "id": "DAILY-025",
    "title": "离线也能整理自己的笔记",
    "description": "在浏览器中写作、预览并管理Markdown笔记。",
    "scene": "life",
    "repo": "https://github.com/benweet/stackedit",
    "stars": 23104,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "6dce2a5e36b755a0c244522b48a06c91a2df0f59",
    "license": "Apache-2.0",
    "chinese": "本轮中文UI未核，中文内容输入/排版另验。",
    "maintenance": "未归档；最近推送 2023-07-04T16:12:06Z；低频/较久未更新，维护风险另评",
    "limitations": [
      "最近推送2023，老依赖与维护风险明显，不列立即集成优先。",
      "云盘同步须单独授权，不把浏览器缓存当可靠备份。"
    ],
    "status": "research",
    "input": "Markdown文字与文件",
    "output": "笔记、预览及可选同步",
    "integration": "中：网页应用；本地保存/导出先行",
    "readmeUrl": "https://github.com/benweet/stackedit/blob/6dce2a5e36b755a0c244522b48a06c91a2df0f59/README.md",
    "licenseUrl": "https://github.com/benweet/stackedit/blob/6dce2a5e36b755a0c244522b48a06c91a2df0f59/LICENSE"
  },
  {
    "id": "DAILY-026",
    "title": "像写文档一样编辑Markdown",
    "description": "在富文本和Markdown之间切换，整理文章。",
    "scene": "life",
    "repo": "https://github.com/nhn/tui.editor",
    "stars": 17988,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "0c5c11bac0b9954e2cac2ff2a081ce8c80a5f14d",
    "license": "MIT",
    "chinese": "多语言能力存在，中文资源本轮未逐文件核。",
    "maintenance": "已归档；最近推送 2024-08-01T15:38:05Z",
    "limitations": [
      "仓库已归档（最近push2024），仅备选参考，不列首批。",
      "插件、远程资源、统计与HTML安全要另核；根MIT不包括任意外部图片。"
    ],
    "status": "research",
    "input": "文字、表格与自有图片",
    "output": "编辑内容与Markdown/HTML",
    "integration": "中：编辑组件，需存储与安全预览",
    "readmeUrl": "https://github.com/nhn/tui.editor/blob/0c5c11bac0b9954e2cac2ff2a081ce8c80a5f14d/README.md",
    "licenseUrl": "https://github.com/nhn/tui.editor/blob/0c5c11bac0b9954e2cac2ff2a081ce8c80a5f14d/LICENSE"
  },
  {
    "id": "DAILY-027",
    "title": "用中文习惯写好一篇笔记",
    "description": "在熟悉的中文操作和Markdown排版间写作。",
    "scene": "life",
    "repo": "https://github.com/Vanessa219/vditor",
    "stars": 11428,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "3a0c64cf97345c2b8a0e1d6d53abbc787d53988c",
    "license": "MIT",
    "chinese": "固定README中文，并明确中文语境优化及i18n配置。",
    "maintenance": "未归档；最近推送 2026-10-18T05:18:57Z",
    "limitations": [
      "CDN资源、上传适配和第三方渲染器要本地化/核许可。",
      "仅编辑器，不等于文件存储、权限、备份和云同步已完成。"
    ],
    "status": "research",
    "input": "Markdown文字及自有附件",
    "output": "编辑文档及预览",
    "integration": "中：浏览器编辑器，需资源本地化",
    "readmeUrl": "https://github.com/Vanessa219/vditor/blob/3a0c64cf97345c2b8a0e1d6d53abbc787d53988c/README.md",
    "licenseUrl": "https://github.com/Vanessa219/vditor/blob/3a0c64cf97345c2b8a0e1d6d53abbc787d53988c/LICENSE"
  },
  {
    "id": "DAILY-028",
    "title": "把零散资料整理成个人知识库",
    "description": "用块、笔记和链接整理长期资料。",
    "scene": "life",
    "repo": "https://github.com/siyuan-note/siyuan",
    "stars": 47056,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "d3af9d5782082b379d45a69eedf4ebcfe8ba6889",
    "license": "AGPL-3.0",
    "chinese": "固定README.zh-CN.md已读，原生中文项目；具体Web版本体验仍需验收。",
    "maintenance": "未归档；最近推送 2026-11-03T17:07:00Z",
    "limitations": [
      "只评AGPL核心；云同步、付费服务、模板和AI配置另算。",
      "需隔离工作空间/附件/备份，不能把本机工作目录直接暴露给其他用户。"
    ],
    "status": "research",
    "input": "笔记、附件和关联",
    "output": "可搜索知识库",
    "integration": "高：内核服务/数据库或文件/账号",
    "readmeUrl": "https://github.com/siyuan-note/siyuan/blob/d3af9d5782082b379d45a69eedf4ebcfe8ba6889/README.ja.md",
    "licenseUrl": "https://github.com/siyuan-note/siyuan/blob/d3af9d5782082b379d45a69eedf4ebcfe8ba6889/LICENSE"
  },
  {
    "id": "DAILY-029",
    "title": "为家里或小团队建一个资料站",
    "description": "把说明、步骤和共同资料整理成页面。",
    "scene": "life",
    "repo": "https://github.com/docmost/docmost",
    "stars": 22211,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "12c549a97505ba25b9ffb7fdcb4f00572144c51e",
    "license": "AGPL-3.0",
    "chinese": "本轮中文翻译文件未确认，需验证或中文封装。",
    "maintenance": "未归档；最近推送 2026-11-03T02:37:42Z",
    "limitations": [
      "仅AGPL核心；README明确packages/ee等企业代码另用商业许可，明确不纳入。",
      "全站授权、附件隔离和导入导出需独立验证，不能直接复制企业功能。"
    ],
    "status": "research",
    "input": "页面、附件与权限设置",
    "output": "可搜索的协作文档空间",
    "integration": "高：后端/数据库/对象存储/账号",
    "readmeUrl": "https://github.com/docmost/docmost/blob/12c549a97505ba25b9ffb7fdcb4f00572144c51e/README.md",
    "licenseUrl": "https://github.com/docmost/docmost/blob/12c549a97505ba25b9ffb7fdcb4f00572144c51e/LICENSE"
  },
  {
    "id": "DAILY-030",
    "title": "把经验整理成一本电子手册",
    "description": "按书、章节和页面保存说明与经验。",
    "scene": "life",
    "repo": "https://github.com/BookStackApp/BookStack",
    "stars": 19123,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "0b6b667e0d84ebb3406de6de9fadbf4230c29c0b",
    "license": "MIT",
    "chinese": "固定lang/zh_CN/common.php已读取中文翻译，覆盖率待实测。",
    "maintenance": "未归档；最近推送 2026-11-03T12:58:49Z",
    "limitations": [
      "README主源已指向Codeberg；此处是GitHub固定快照，不把镜像push当独立维护承诺。",
      "附件、公开分享、编辑权限和导出需平台隔离。"
    ],
    "status": "research",
    "input": "文字、图片、章节结构",
    "output": "可搜索手册与分享页面",
    "integration": "高：PHP/数据库/账号",
    "readmeUrl": "https://github.com/BookStackApp/BookStack/blob/0b6b667e0d84ebb3406de6de9fadbf4230c29c0b/readme.md",
    "licenseUrl": "https://github.com/BookStackApp/BookStack/blob/0b6b667e0d84ebb3406de6de9fadbf4230c29c0b/LICENSE"
  },
  {
    "id": "DAILY-031",
    "title": "为自己的资料建一个百科",
    "description": "整理常用知识、说明和互相链接的页面。",
    "scene": "life",
    "repo": "https://github.com/Requarks/wiki",
    "stars": 29142,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "fc365d6b233165c16773ea39655023d5b071e417",
    "license": "AGPL-3.0",
    "chinese": "README有多语言方向，本轮中文文件未逐一读，待确认。",
    "maintenance": "未归档；最近推送 2026-11-03T06:25:38Z",
    "limitations": [
      "当前默认scarlett分支为固定分支快照，不等于稳定发布版。",
      "选择实际发行版本前需另锁依赖、迁移和账号权限。"
    ],
    "status": "research",
    "input": "知识页面、附件、目录",
    "output": "个人/团队Wiki",
    "integration": "高：服务端/数据库/账号",
    "readmeUrl": "https://github.com/Requarks/wiki/blob/fc365d6b233165c16773ea39655023d5b071e417/README.md",
    "licenseUrl": "https://github.com/Requarks/wiki/blob/fc365d6b233165c16773ea39655023d5b071e417/LICENSE"
  },
  {
    "id": "DAILY-032",
    "title": "随手记下今天的想法",
    "description": "把短笔记、照片和日常记录放在时间线上。",
    "scene": "life",
    "repo": "https://github.com/usememos/memos",
    "stars": 64248,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "b40d8a7b573774c52b022c8d6537d6baf2129dc0",
    "license": "MIT",
    "chinese": "固定web/src/locales/zh-Hans.json已核，含简繁中文资源。",
    "maintenance": "未归档；最近推送 2026-11-02T13:10:22Z",
    "limitations": [
      "私人记录与公开分享要分权限，不默认公开。",
      "附件备份/配额/迁移及API令牌保护仍需接入验收。"
    ],
    "status": "research",
    "input": "短文字及自有图片/附件",
    "output": "个人记录时间线与检索",
    "integration": "中至高：轻量服务端和持久存储",
    "readmeUrl": "https://github.com/usememos/memos/blob/b40d8a7b573774c52b022c8d6537d6baf2129dc0/README.md",
    "licenseUrl": "https://github.com/usememos/memos/blob/b40d8a7b573774c52b022c8d6537d6baf2129dc0/LICENSE"
  },
  {
    "id": "DAILY-033",
    "title": "用普通文件保存简洁笔记",
    "description": "用Markdown文件记录内容，减少管理负担。",
    "scene": "life",
    "repo": "https://github.com/dullage/flatnotes",
    "stars": 3274,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "7f5b773c9cb37cc84978079ed4790e7de38d3970",
    "license": "MIT",
    "chinese": "本轮中文UI未确认；中文搜索/输入待实测。",
    "maintenance": "未归档；最近推送 2026-08-29T07:02:54Z",
    "limitations": [
      "数据库少不代表无后端或可把用户文件夹直接公开。",
      "文件路径隔离、认证、备份和编辑器依赖需核。"
    ],
    "status": "research",
    "input": "文字、标签和搜索词",
    "output": "笔记文件与检索结果",
    "integration": "中：服务端文件存储，需账号隔离",
    "readmeUrl": "https://github.com/dullage/flatnotes/blob/7f5b773c9cb37cc84978079ed4790e7de38d3970/README.md",
    "licenseUrl": "https://github.com/dullage/flatnotes/blob/7f5b773c9cb37cc84978079ed4790e7de38d3970/LICENSE"
  },
  {
    "id": "DAILY-034",
    "title": "整理一个自己的家庭相册",
    "description": "给照片分相册，按需要私密保存或分享。",
    "scene": "life",
    "repo": "https://github.com/LycheeOrg/Lychee",
    "stars": 4325,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "7121888c280eb7be7395016c5c615b210f024996",
    "license": "MIT",
    "chinese": "有lang目录，但本轮中文文件读取未成功，中文覆盖待确认。",
    "maintenance": "未归档；最近推送 2026-11-03T10:56:44Z",
    "limitations": [
      "原始照片可能含EXIF位置；隐私、分享与删除策略须实现。",
      "缩略图/队列、账号隔离、资源占用和手机上传尚未实测。"
    ],
    "status": "research",
    "input": "自有照片和相册设置",
    "output": "图库、相册和受控分享",
    "integration": "高：PHP后端/数据库/图片存储",
    "readmeUrl": "https://github.com/LycheeOrg/Lychee/blob/7121888c280eb7be7395016c5c615b210f024996/README.md",
    "licenseUrl": "https://github.com/LycheeOrg/Lychee/blob/7121888c280eb7be7395016c5c615b210f024996/LICENSE"
  },
  {
    "id": "DAILY-035",
    "title": "把许多照片整理成分类图库",
    "description": "为照片加分类和标签，方便浏览与分享。",
    "scene": "life",
    "repo": "https://github.com/Piwigo/Piwigo",
    "stars": 3881,
    "checkedAt": "2026-11-03T17:27:31Z",
    "commit": "db96b76c3c02fc4893559fea8cf8f346a0bd05a7",
    "license": "GPL-2.0（COPYING及LICENSE.txt）",
    "chinese": "固定language/zh_CN/common.lang.php已核，另有繁体目录。",
    "maintenance": "未归档；最近推送 2026-11-03T14:02:03Z",
    "limitations": [
      "根COPYING指向LICENSE.txt的GPLv2，插件和主题另核。",
      "图库权限、原图EXIF、备份和上传限制都需要平台接入。"
    ],
    "status": "research",
    "input": "自有照片、分类和标签",
    "output": "可搜索图库及相册",
    "integration": "高：PHP/数据库/相册存储",
    "readmeUrl": "https://github.com/Piwigo/Piwigo/blob/db96b76c3c02fc4893559fea8cf8f346a0bd05a7/README.md",
    "licenseUrl": "https://github.com/Piwigo/Piwigo/blob/db96b76c3c02fc4893559fea8cf8f346a0bd05a7/COPYING.txt"
  }
];
