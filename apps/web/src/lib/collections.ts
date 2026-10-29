export type SceneId = "work" | "life" | "creative";
export type CollectionIdea = {
  id: string;
  scene: "life" | "creative";
  title: string;
  description: string;
  category: string;
  input: string;
  output: string;
  limitations: string[];
  status: "待评估";
};

export const sceneCollections = [
  {
    id: "work",
    title: "开店与工作",
    intro: "把生意里的小事理顺",
    examples: "开店筹备 · 文件表格 · 宣传接单",
    icon: "shop",
  },
  {
    id: "life",
    title: "生活小工具",
    intro: "让日常的琐事简单一点",
    examples: "照片拼接 · 文件整理 · 生活清单",
    icon: "leaf",
  },
  {
    id: "creative",
    title: "创意与娱乐",
    intro: "给照片、声音和想法一点新花样",
    examples: "趣味合成 · 表情包 · 回忆短片",
    icon: "spark",
  },
] as const;

// Cross-scene views reuse the original FUN identifiers; they are not new research entries.
export const collectionCapabilityIds: Record<"life" | "creative", string[]> = {
  life: [
    "FUN-038",
    "FUN-051",
    "FUN-052",
    "FUN-061",
    "FUN-062",
    "FUN-063",
    "FUN-064",
    "FUN-065",
    "FUN-066",
    "FUN-067",
    "FUN-068",
    "FUN-070",
    "FUN-071",
    "FUN-072",
    "FUN-080",
    "FUN-081",
    "FUN-085",
  ],
  creative: [
    "FUN-046",
    "FUN-050",
    "FUN-051",
    "FUN-052",
    "FUN-054",
    "FUN-055",
    "FUN-056",
    "FUN-057",
    "FUN-058",
    "FUN-059",
    "FUN-066",
    "FUN-067",
    "FUN-069",
    "FUN-083",
    "FUN-084",
    "FUN-085",
  ],
};

const collectionCopy: Record<string, { title: string; description: string }> = {
  "FUN-038": {
    title: "把纸质资料变成可搜索的文件",
    description: "扫描材料、识别文字，整理后更容易找。",
  },
  "FUN-046": {
    title: "用自己的素材整理一段视频",
    description: "把拍到的片段组织成故事，先看候选方案和限制。",
  },
  "FUN-061": {
    title: "把几份文件合成一个 PDF",
    description: "零散材料合在一起，分享和保存更方便。",
  },
  "FUN-062": {
    title: "从 PDF 中取出需要的几页",
    description: "只留下要用的内容，不必传整份文件。",
  },
  "FUN-063": {
    title: "给扫描文件调顺页码和方向",
    description: "页面倒了、顺序乱了，整理后再保存。",
  },
  "FUN-065": {
    title: "给文件副本加水印或页码",
    description: "给分享的副本补上文字标记。",
  },
  "FUN-066": {
    title: "让图片小一点，还能看清楚",
    description: "压缩照片并对照清晰度，方便保存和发送。",
  },
  "FUN-067": {
    title: "换一种图片格式",
    description: "把照片转成需要的文件格式。",
  },
  "FUN-068": {
    title: "把照片调成指定尺寸",
    description: "按像素准备上传材料；证件要求仍需自行核对。",
  },
  "FUN-069": {
    title: "做一张海报或活动卡片",
    description: "排好图片和文字，保留可继续编辑的设计。",
  },
  "FUN-070": {
    title: "把长网页留成一张截图",
    description: "保存页面里的连续内容，方便回头查看。",
  },
  "FUN-071": {
    title: "读出图片里的二维码",
    description: "先看清二维码内容，再自行决定是否打开。",
  },
  "FUN-072": {
    title: "把一段资料变成二维码",
    description: "沿用已有资料二维码候选，编码内容范围以详情为准。",
  },
  "FUN-080": {
    title: "在网页里改 Word 文件",
    description: "修改后下载，之后还能继续编辑。",
  },
  "FUN-081": {
    title: "在网页里改 Excel 表格",
    description: "整理数据和公式后，下载工作簿。",
  },
  "FUN-083": {
    title: "给照片去掉背景",
    description: "沿用已有去背景候选；人像效果和模型许可需另核。",
  },
  "FUN-084": {
    title: "擦掉照片里不想要的杂物",
    description: "圈出局部区域，评估补齐背景的效果。",
  },
  "FUN-085": {
    title: "放大一张小图片",
    description: "对照放大前后的细节，不保证还原原本不存在的信息。",
  },
};
export function getCollectionCopy(id: string) {
  return collectionCopy[id];
}

const idea = (
  id: string,
  scene: "life" | "creative",
  title: string,
  description: string,
  input: string,
  output: string,
  limitations: string[],
): CollectionIdea => ({
  id,
  scene,
  title,
  description,
  category: scene === "life" ? "生活新点子" : "创意新点子",
  input,
  output,
  limitations,
  status: "待评估",
});
export const collectionIdeas: CollectionIdea[] = [
  idea(
    "LIFE-001",
    "life",
    "把两张照片拼在一起",
    "横着拼、竖着拼，也可以把多张照片排成网格。",
    "自行选择的图片、顺序、拼接方向和留白",
    "一张可预览、下载的拼接图",
    [
      "新方向建议，尚未选定软件或开发处理器。",
      "计划先比较浏览器本地处理方案，不默认上传照片。",
    ],
  ),
  idea(
    "LIFE-002",
    "life",
    "给照片上的私人信息打码",
    "分享前，遮住手机号、地址或其他不想公开的文字。",
    "照片与手动选择的遮挡区域",
    "带遮挡的分享副本",
    [
      "先评估手动遮挡，不承诺自动识别所有隐私。",
      "导出效果、元数据清理和撤销行为尚待设计。",
    ],
  ),
  idea(
    "LIFE-003",
    "life",
    "给一批文件改个整齐的名字",
    "照片和资料按日期、序号或自己的规则排好名字。",
    "用户明确选择的文件与命名规则",
    "改名预览及可下载的文件集合",
    [
      "尚未实现；不自动读取或修改设备上的其他文件。",
      "重名冲突、撤销与打包下载限制待验证。",
    ],
  ),
  idea(
    "LIFE-004",
    "life",
    "整理一段乱糟糟的文字",
    "去掉多余空行、重复内容，顺便看看字数。",
    "用户粘贴的文字与清理选项",
    "可对照、复制的清理结果",
    [
      "建议优先用普通软件能力，不强制调用 AI。",
      "不自动改写事实内容；规则及隐私处理方式待评估。",
    ],
  ),
  idea(
    "LIFE-005",
    "life",
    "算算两个日子相隔多久",
    "出行、生日或纪念日，把日期算清楚。",
    "两个日期或纪念日",
    "日期间隔与纪念日清单候选",
    [
      "公历、时区和计算边界需要明确。",
      "提醒渠道未选定，不会自动发送短信或邮件。",
    ],
  ),
  idea(
    "LIFE-006",
    "life",
    "把常用单位换算一下",
    "长度、重量和温度，换成自己熟悉的单位。",
    "数值、原单位与目标单位",
    "带单位和精度说明的换算结果",
    [
      "先限定普通生活单位，不用于医疗剂量或其他专业决策。",
      "单位范围、舍入规则与小数精度待验证。",
    ],
  ),
  idea(
    "PLAY-001",
    "creative",
    "像图层一样合成几张图片",
    "移动、缩放和叠放图片，做出有趣的新画面。",
    "自有或获授权的图片、图层顺序与位置",
    "可预览的合成图与可编辑工程候选",
    [
      "新方向，需评估完整编辑器或图形库，尚未采用。",
      "不把简单拼接称为已具备完整 PS 能力。",
    ],
  ),
  idea(
    "PLAY-002",
    "creative",
    "给图片加字做个表情包",
    "配一句话，做一张属于自己的小表情。",
    "自有图片、文字与字体选择",
    "带文字的图片或表情包",
    ["字体和素材授权需分别核查。", "静态与动态表情导出范围尚未确定。"],
  ),
  idea(
    "PLAY-003",
    "creative",
    "给照片换一种有趣的画风",
    "试试漫画头像或复古氛围，找到喜欢的感觉。",
    "本人或获授权的照片与风格选择",
    "可对照原图的风格化图片候选",
    [
      "普通滤镜与需要模型的画风转换分开评估。",
      "尚未选择模型或 API；效果和模型商用条件待核。",
    ],
  ),
  idea(
    "PLAY-004",
    "creative",
    "用授权照片试试趣味换脸",
    "为本人或已获授权的照片探索趣味合成。",
    "本人或已获授权的来源与目标照片",
    "带可识别合成标记的预览候选",
    [
      "仅为待评估方向，当前不接收人脸照片、不上传或调用 API。",
      "需先核查代码及人脸模型许可、处理位置、临时文件删除和授权流程。",
      "不用于冒充他人；不承诺所有照片都适用。",
    ],
  ),
  idea(
    "PLAY-005",
    "creative",
    "把几张图片做成小动图",
    "让照片连起来动一下，做个简单的循环动画。",
    "自有图片、顺序与每帧时长",
    "可预览的 GIF 或动图候选",
    [
      "导出格式、体积与透明背景支持尚待验证。",
      "不把动图工具当作完整视频编辑器。",
    ],
  ),
  idea(
    "PLAY-006",
    "creative",
    "把旅行照片做成回忆小片",
    "照片加字幕和音乐，留下一个小故事。",
    "自有照片、文字及有权使用的音乐",
    "可预览、导出的照片短片候选",
    [
      "需组合排版、时间轴和音频能力，尚未接入。",
      "音乐、字体和模板许可分别核查，不默认提供可商用曲库。",
    ],
  ),
];
