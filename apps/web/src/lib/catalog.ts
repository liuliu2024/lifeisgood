export type CatalogItem = { id: string; title: string; description: string; category: string; stage: string; industry: string[]; input: string; output: string; candidates: string[]; status: "待接入"; limitations: string[]; evidence: "资料已有" | "需组合" | "待核实"; };

export const categories: string[] = ["采购、商品和库存","生产用料与设备","客户、商机和售后","报价、接单、合同与交付","账单、收支与经营报表","商城、活动与订单","预约与排班","Office、表单与表格处理","手册、团队任务与工时","PDF、OCR与归档","海报、图片处理与修图","截图、二维码与批量标签","自有视频、字幕、音乐与导出","经营资料问答与AI流程","网站访问与转化统计","SEO检查、Google排名与发布草稿"];
export const stages: string[] = ["起名与筹备","选址与开店预算","登记与开业准备","门店信息与地图入驻","商品与服务准备","宣传与获客","接单与履约","收款与经营记录","团队与日常运营","复购与经营复盘"];
export const industries: string[] = ["通用","餐饮","服装零售","汽修","本地服务","小型加工"];
export const catalog: CatalogItem[] = [
  {
    "id": "FUN-001",
    "title": "整理商品和服务目录",
    "description": "商品/服务资料→统一目录；不要求把服务当库存品",
    "category": "采购、商品和库存",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "商品/服务资料",
    "output": "统一目录；不要求把服务当库存品",
    "candidates": [
      "Dolibarr",
      "jshERP",
      "ERPNext"
    ],
    "status": "待接入",
    "limitations": [
      "P02 GPL-3+；模块/API覆盖逐项核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-002",
    "title": "维护供应商和联系人",
    "description": "供应商及联系人→可查的供应商档案",
    "category": "采购、商品和库存",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "供应商及联系人",
    "output": "可查的供应商档案",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "GPL-3+；个人信息与权限需设计"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-003",
    "title": "向供应商整理询价",
    "description": "待购项目→供应商价格请求",
    "category": "采购、商品和库存",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "待购项目",
    "output": "供应商价格请求",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "不承诺自动向外发送；GPL范围"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-004",
    "title": "跟踪采购订单",
    "description": "采购清单与供应商→采购单及状态",
    "category": "采购、商品和库存",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "采购清单与供应商",
    "output": "采购单及状态",
    "candidates": [
      "Dolibarr",
      "ERPNext"
    ],
    "status": "待接入",
    "limitations": [
      "GPL范围；本地字段与审批待核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-005",
    "title": "登记到货与收货",
    "description": "采购到货信息→接收记录",
    "category": "采购、商品和库存",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "采购到货信息",
    "output": "接收记录",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "接收记录不等于质检合格结论"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-006",
    "title": "管仓库与盘点库存",
    "description": "商品、仓库、盘点量→库存记录",
    "category": "采购、商品和库存",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "商品、仓库、盘点量",
    "output": "库存记录",
    "candidates": [
      "jshERP",
      "Dolibarr",
      "ERPNext"
    ],
    "status": "待接入",
    "limitations": [
      "Apache/GPL按所选项目；历史箱规问题未复现"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-007",
    "title": "用条码标识管理商品",
    "description": "商品与条码→可关联的商品标识",
    "category": "采购、商品和库存",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "商品与条码",
    "output": "可关联的商品标识",
    "candidates": [
      "Dolibarr",
      "JsBarcode"
    ],
    "status": "待接入",
    "limitations": [
      "GPL或MIT按所选组件；生成码图不等于商品编码注册或扫码入库，也不是完整热敏打印驱动"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-008",
    "title": "追踪批次和序列号",
    "description": "商品批次/序列→追溯记录",
    "category": "采购、商品和库存",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "商品批次/序列",
    "output": "追溯记录",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "GPL；具体追溯报表和权限待核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-009",
    "title": "管理同商品的规格变体",
    "description": "规格组合→商品变体目录",
    "category": "采购、商品和库存",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "规格组合",
    "output": "商品变体目录",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "变体不等于多箱规自动换算"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-010",
    "title": "整理生产用料清单",
    "description": "产品和材料→BOM",
    "category": "生产用料与设备",
    "stage": "商品与服务准备",
    "industry": [
      "小型加工"
    ],
    "input": "产品和材料",
    "output": "BOM",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "GPL；损耗、工艺与本地流程另核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-011",
    "title": "记录生产工单",
    "description": "生产任务与BOM→制造订单",
    "category": "生产用料与设备",
    "stage": "商品与服务准备",
    "industry": [
      "小型加工"
    ],
    "input": "生产任务与BOM",
    "output": "制造订单",
    "candidates": [
      "Dolibarr",
      "ERPNext"
    ],
    "status": "待接入",
    "limitations": [
      "不承诺MES实时采集或设备控制"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-012",
    "title": "管理经营固定资产",
    "description": "设备等资产资料→资产管理记录",
    "category": "生产用料与设备",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "设备等资产资料",
    "output": "资产管理记录",
    "candidates": [
      "ERPNext"
    ],
    "status": "待接入",
    "limitations": [
      "GPL；具体折旧、地区会计规则未核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-013",
    "title": "整理客户及联系记录",
    "description": "客户/联系人→CRM档案",
    "category": "客户、商机和售后",
    "stage": "复购与经营复盘",
    "industry": [
      "通用"
    ],
    "input": "客户/联系人",
    "output": "CRM档案",
    "candidates": [
      "Dolibarr",
      "Twenty",
      "Odoo Community"
    ],
    "status": "待接入",
    "limitations": [
      "P02 GPL、P05混合许可；不能混入Enterprise文件"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-014",
    "title": "跟踪商机与线索",
    "description": "线索和机会→商机管理",
    "category": "客户、商机和售后",
    "stage": "复购与经营复盘",
    "industry": [
      "通用"
    ],
    "input": "线索和机会",
    "output": "商机管理",
    "candidates": [
      "Dolibarr",
      "Twenty"
    ],
    "status": "待接入",
    "limitations": [
      "不把销售漏斗当实际成交预测保证"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-015",
    "title": "制作可交付报价单",
    "description": "客户、条目和价格→报价/PDF或ODT",
    "category": "报价、接单、合同与交付",
    "stage": "接单与履约",
    "industry": [
      "通用"
    ],
    "input": "客户、条目和价格",
    "output": "报价/PDF或ODT",
    "candidates": [
      "Dolibarr",
      "ERPNext",
      "Odoo Community"
    ],
    "status": "待接入",
    "limitations": [
      "自由估价/无需主数据尚待核；非中国税务发票"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-016",
    "title": "跟踪客户订单进度",
    "description": "已确认需求→客户订单状态",
    "category": "报价、接单、合同与交付",
    "stage": "接单与履约",
    "industry": [
      "通用"
    ],
    "input": "已确认需求",
    "output": "客户订单状态",
    "candidates": [
      "Dolibarr",
      "ERPNext",
      "Odoo Community"
    ],
    "status": "待接入",
    "limitations": [
      "服务单与实物库存状态应分开验证"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-017",
    "title": "管理服务合同与订阅",
    "description": "合同或周期服务→合同/订阅记录",
    "category": "报价、接单、合同与交付",
    "stage": "接单与履约",
    "industry": [
      "通用"
    ],
    "input": "合同或周期服务",
    "output": "合同/订阅记录",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "GPL；不将记录合同等同电子签法律效力"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-018",
    "title": "登记上门或现场服务工作",
    "description": "客户服务事项→intervention记录",
    "category": "报价、接单、合同与交付",
    "stage": "接单与履约",
    "industry": [
      "通用"
    ],
    "input": "客户服务事项",
    "output": "intervention记录",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "字段、签收与汽修等行业适配未核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-019",
    "title": "记录发货与交付",
    "description": "销售单与发货内容→shipping记录",
    "category": "报价、接单、合同与交付",
    "stage": "接单与履约",
    "industry": [
      "通用"
    ],
    "input": "销售单与发货内容",
    "output": "shipping记录",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "不承诺已接国内快递或自动取件"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-020",
    "title": "整理客户账单及贷项调整",
    "description": "销售金额、收款/冲销→客户单据记录",
    "category": "账单、收支与经营报表",
    "stage": "收款与经营记录",
    "industry": [
      "通用"
    ],
    "input": "销售金额、收款/冲销",
    "output": "客户单据记录",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "invoice/credit note不是中国税务发票；本地财税另核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-021",
    "title": "整理供应商应付款",
    "description": "供应商账单与支付→应付记录",
    "category": "账单、收支与经营报表",
    "stage": "收款与经营记录",
    "industry": [
      "通用"
    ],
    "input": "供应商账单与支付",
    "output": "应付记录",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "不等于已接银行付款或支付通道"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-022",
    "title": "记录经营银行账户",
    "description": "账户与资金信息→账户管理记录；轻账本可选收入/支出/转账和分类流水",
    "category": "账单、收支与经营报表",
    "stage": "收款与经营记录",
    "industry": [
      "通用"
    ],
    "input": "账户与资金信息",
    "output": "账户管理记录；轻账本可选收入/支出/转账和分类流水",
    "candidates": [
      "Dolibarr",
      "ezBookkeeping",
      "Actual Budget",
      "Firefly III",
      "Money Manager Ex"
    ],
    "status": "待接入",
    "limitations": [
      "轻账本个人财务非企业税务总账，多人账簿待核；SEPA不直接用于大陆"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-023",
    "title": "查看毛利与经营报表",
    "description": "已记录销售与成本→margin/report",
    "category": "账单、收支与经营报表",
    "stage": "收款与经营记录",
    "industry": [
      "通用"
    ],
    "input": "已记录销售与成本",
    "output": "margin/report",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "口径/税费/成本完整性需明确，非收益保证"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-024",
    "title": "记录门店POS销售",
    "description": "柜台销售→POS业务记录",
    "category": "账单、收支与经营报表",
    "stage": "收款与经营记录",
    "industry": [
      "通用"
    ],
    "input": "柜台销售",
    "output": "POS业务记录",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "没有微信支付宝账户时不能称可真实收款"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-025",
    "title": "整理售后问题工单",
    "description": "客户问题→ticket与处理记录",
    "category": "客户、商机和售后",
    "stage": "接单与履约",
    "industry": [
      "通用"
    ],
    "input": "客户问题",
    "output": "ticket与处理记录",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "不等于自动微信回访或自动外发"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-026",
    "title": "把商品分类、品牌和专题上架",
    "description": "商品展示资料→商城分类/专题/详情",
    "category": "商城、活动与订单",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "商品展示资料",
    "output": "商城分类/专题/详情",
    "candidates": [
      "litemall"
    ],
    "status": "待接入",
    "limitations": [
      "MIT代码；图片/品牌权利另核；文档CC-BY-ND"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-027",
    "title": "让客户自助选购下单",
    "description": "商品选择/购物车→在线订单",
    "category": "商城、活动与订单",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "商品选择/购物车",
    "output": "在线订单",
    "candidates": [
      "litemall"
    ],
    "status": "待接入",
    "limitations": [
      "与内部订单台账不同；微信/支付需配置"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-028",
    "title": "做优惠券与团购活动",
    "description": "活动规则→优惠券/团购入口",
    "category": "商城、活动与订单",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "活动规则",
    "output": "优惠券/团购入口",
    "candidates": [
      "litemall"
    ],
    "status": "待接入",
    "limitations": [
      "不保证营销效果；具体规则/补贴承担待核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-029",
    "title": "处理商城订单和售后申请",
    "description": "自助订单及售后请求→订单售后状态",
    "category": "商城、活动与订单",
    "stage": "商品与服务准备",
    "industry": [
      "通用"
    ],
    "input": "自助订单及售后请求",
    "output": "订单售后状态",
    "candidates": [
      "litemall"
    ],
    "status": "待接入",
    "limitations": [
      "与通用问题工单不同；不承诺退款通道已接通"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-030",
    "title": "安排可预约的服务和员工",
    "description": "服务项目与提供者→预约资源目录",
    "category": "预约与排班",
    "stage": "接单与履约",
    "industry": [
      "通用"
    ],
    "input": "服务项目与提供者",
    "output": "预约资源目录",
    "candidates": [
      "Easy!Appointments"
    ],
    "status": "待接入",
    "limitations": [
      "GPL代码；员工资源权限与商户隔离待核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-031",
    "title": "设置营业时间和预约规则",
    "description": "员工工时/规则→可预约计划",
    "category": "预约与排班",
    "stage": "接单与履约",
    "industry": [
      "通用"
    ],
    "input": "员工工时/规则",
    "output": "可预约计划",
    "candidates": [
      "Easy!Appointments"
    ],
    "status": "待接入",
    "limitations": [
      "并发冲突、改期、取消规则未实测"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-032",
    "title": "让客户按时间预约服务",
    "description": "客户、服务、时间→预约记录",
    "category": "预约与排班",
    "stage": "接单与履约",
    "industry": [
      "通用"
    ],
    "input": "客户、服务、时间",
    "output": "预约记录",
    "candidates": [
      "Easy!Appointments"
    ],
    "status": "待接入",
    "limitations": [
      "不把预约创建成功等同短信送达"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-033",
    "title": "将预约与日历、邮件联动",
    "description": "预约变化→日历同步及邮件通知",
    "category": "预约与排班",
    "stage": "接单与履约",
    "industry": [
      "通用"
    ],
    "input": "预约变化",
    "output": "日历同步及邮件通知",
    "candidates": [
      "Easy!Appointments"
    ],
    "status": "待接入",
    "limitations": [
      "不含未经核验的Premium/SMS；送达需另验"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-034",
    "title": "用表单收集多人填写结果",
    "description": "表单字段与填报→结构化数据；可补字段联动/验证/子表单",
    "category": "Office、表单与表格处理",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "表单字段与填报",
    "output": "结构化数据；可补字段联动/验证/子表单",
    "candidates": [
      "Baserow OSE",
      "form-create"
    ],
    "status": "待接入",
    "limitations": [
      "MIT OSE/组件；高级权限、独立设计器和Pro站不自动包含；不能把前端组件当完整SaaS"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-035",
    "title": "建立可多人维护的经营台账",
    "description": "业务字段与记录→表格式数据库；Excelize可补工作簿文件读写/样式",
    "category": "Office、表单与表格处理",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "业务字段与记录",
    "output": "表格式数据库；Excelize可补工作簿文件读写/样式",
    "candidates": [
      "Baserow OSE",
      "jshERP",
      "Excelize",
      "Univer OSS",
      "ezBookkeeping"
    ],
    "status": "待接入",
    "limitations": [
      "MIT OSE、BSD库各守许可；不把premium仪表盘/审计、会计规则当已有"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-036",
    "title": "编写团队手册和操作说明",
    "description": "文字/图片→项目化知识文档",
    "category": "手册、团队任务与工时",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "文字/图片",
    "output": "项目化知识文档",
    "candidates": [
      "MinDoc",
      "DooTask",
      "Univer OSS"
    ],
    "status": "待接入",
    "limitations": [
      "Apache；编辑器/导出依赖另核；不照搬默认MCP/演示Key，不将秘密放URL或日志",
      "MinDoc编辑器含Froala接入路径，具体构建授权未核，不进入首批。"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-037",
    "title": "受控分享内部经营手册",
    "description": "项目成员/公开状态→访问范围",
    "category": "手册、团队任务与工时",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "项目成员/公开状态",
    "output": "访问范围",
    "candidates": [
      "MinDoc"
    ],
    "status": "待接入",
    "limitations": [
      "原项目token不是平台多租户证明；不复用演示Key；认证无法避免秘密入URL/日志时保持MCP禁用",
      "MinDoc编辑器含Froala接入路径，具体构建授权未核，不进入首批。"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-038",
    "title": "将纸质材料OCR归档并检索",
    "description": "扫描件/PDF→可检索档案；Umi/Paddle补图片/扫描PDF识别路径",
    "category": "PDF、OCR与归档",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "扫描件/PDF",
    "output": "可检索档案；Umi/Paddle补图片/扫描PDF识别路径",
    "candidates": [
      "Paperless-ngx",
      "PaddleOCR",
      "Umi-OCR"
    ],
    "status": "待接入",
    "limitations": [
      "GPL/MIT/Apache分别核；引擎插件/权重/hash另锁；识别不等于字段正确或发票验真"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-039",
    "title": "分派团队项目任务和日程",
    "description": "项目、任务、负责人→任务/共享日程",
    "category": "手册、团队任务与工时",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "项目、任务、负责人",
    "output": "任务/共享日程",
    "candidates": [
      "Dolibarr",
      "DooTask"
    ],
    "status": "待接入",
    "limitations": [
      "GPL或AGPL；不承诺Dolibarr任务依赖已支持"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-040",
    "title": "整理员工请假、工时和费用申报",
    "description": "人员事项→HR记录/报告",
    "category": "手册、团队任务与工时",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "人员事项",
    "output": "HR记录/报告",
    "candidates": [
      "Dolibarr"
    ],
    "status": "待接入",
    "limitations": [
      "不含README明确未支持的工资Payroll；地区劳动规则另核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-041",
    "title": "看经营网站访问情况",
    "description": "网站追踪数据→traffic分析",
    "category": "网站访问与转化统计",
    "stage": "复购与经营复盘",
    "industry": [
      "通用"
    ],
    "input": "网站追踪数据",
    "output": "traffic分析",
    "candidates": [
      "Umami"
    ],
    "status": "待接入",
    "limitations": [
      "MIT；数据收集策略另核；不等于SEO优化"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-042",
    "title": "看活动来源与转化表现",
    "description": "campaigns/行为/转化事件→活动分析",
    "category": "网站访问与转化统计",
    "stage": "复购与经营复盘",
    "industry": [
      "通用"
    ],
    "input": "campaigns/行为/转化事件",
    "output": "活动分析",
    "candidates": [
      "Umami"
    ],
    "status": "待接入",
    "limitations": [
      "不从宣传推出真实ROI或增长保证"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-043",
    "title": "用经营资料建立问答助手",
    "description": "自有文档→知识库检索问答",
    "category": "经营资料问答与AI流程",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "自有文档",
    "output": "知识库检索问答",
    "candidates": [
      "MaxKB"
    ],
    "status": "待接入",
    "limitations": [
      "GPL；模型/资料外发和权重另核；不能保证无幻觉"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-044",
    "title": "编排多步骤AI处理流程",
    "description": "流程节点与条件→工作流",
    "category": "经营资料问答与AI流程",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "流程节点与条件",
    "output": "工作流",
    "candidates": [
      "MaxKB"
    ],
    "status": "待接入",
    "limitations": [
      "不把企业版全特性当GPL公开版已有"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-045",
    "title": "给知识助手接入指定工具",
    "description": "站长选定工具/端点→可调用工具链",
    "category": "经营资料问答与AI流程",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "站长选定工具/端点",
    "output": "可调用工具链",
    "candidates": [
      "MaxKB"
    ],
    "status": "待接入",
    "limitations": [
      "工具写操作/凭据/权限分别审核；用户保留配置权"
    ],
    "evidence": "需组合"
  },
  {
    "id": "FUN-046",
    "title": "用自有素材组织镜头",
    "description": "自有图片/原片→画面分析及镜头编排",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "自有图片/原片",
    "output": "画面分析及镜头编排",
    "candidates": [
      "FireRed-OpenStoryline",
      "NarratoAI"
    ],
    "status": "待接入",
    "limitations": [
      "素材权利/模型另核；Narrato偏影视解说，不承诺任意场景"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-047",
    "title": "按说出来的文字选段成片",
    "description": "原片转录与选段文字→拼接片段",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "原片转录与选段文字",
    "output": "拼接片段",
    "candidates": [
      "FunClip"
    ],
    "status": "待接入",
    "limitations": [
      "ASR权重另核；逐词精度取决于模型"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-048",
    "title": "只保留某位说话人的片段",
    "description": "ASR说话人标签→对应剪辑片段",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "ASR说话人标签",
    "output": "对应剪辑片段",
    "candidates": [
      "FunClip"
    ],
    "status": "待接入",
    "limitations": [
      "标签不等于实名识别；声音/权重条款另核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-049",
    "title": "清理口播填充词与重复表达",
    "description": "口播原片→粗剪候选",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "口播原片",
    "output": "粗剪候选",
    "candidates": [
      "FireRed-OpenStoryline"
    ],
    "status": "待接入",
    "limitations": [
      "保留候选，不列为已完整支持或已实测；摘要不得抹去矛盾"
    ],
    "evidence": "待核实"
  },
  {
    "id": "FUN-050",
    "title": "自动剪掉静音并调整片段速度",
    "description": "音视频与规则→规则粗剪",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "音视频与规则",
    "output": "规则粗剪",
    "candidates": [
      "Auto-Editor"
    ],
    "status": "待接入",
    "limitations": [
      "Unlicense源码；规则不等于理解叙事"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-051",
    "title": "转录音视频并交付时间轴字幕",
    "description": "音视频→转录/完整或片段SRT",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "音视频",
    "output": "转录/完整或片段SRT",
    "candidates": [
      "FunClip",
      "VideoLingo"
    ],
    "status": "待接入",
    "limitations": [
      "权重及云端音频去向另核；不是自动成片全流程"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-052",
    "title": "做双语翻译字幕",
    "description": "原字幕/视频→翻译与双语字幕",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "原字幕/视频",
    "output": "翻译与双语字幕",
    "candidates": [
      "VideoLingo"
    ],
    "status": "待接入",
    "limitations": [
      "翻译模型、原内容权利另核；不等于重剪原片"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-053",
    "title": "统一字幕术语、分句与长度",
    "description": "字幕及术语约束→整理后的字幕",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "字幕及术语约束",
    "output": "整理后的字幕",
    "candidates": [
      "VideoLingo"
    ],
    "status": "待接入",
    "limitations": [
      "术语校验效果未测；不承诺零错漏"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-054",
    "title": "修改字幕并烧录到画面",
    "description": "字幕文字/位置/字体→硬字幕视频",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "字幕文字/位置/字体",
    "output": "硬字幕视频",
    "candidates": [
      "FireRed-OpenStoryline",
      "NarratoAI",
      "FunClip"
    ],
    "status": "待接入",
    "limitations": [
      "字体许可独立；保留可编辑原字幕"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-055",
    "title": "根据主题或原片写解说脚本",
    "description": "主题/画面信息→解说稿",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "主题/画面信息",
    "output": "解说稿",
    "candidates": [
      "MoneyPrinterTurbo",
      "NarratoAI",
      "FireRed-OpenStoryline"
    ],
    "status": "待接入",
    "limitations": [
      "事实需核实；脚本生成不等于真实商品资料"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-056",
    "title": "把解说稿变成配音并混合原声",
    "description": "文字与声音设置→配音音轨/视频",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "文字与声音设置",
    "output": "配音音轨/视频",
    "candidates": [
      "MoneyPrinterTurbo",
      "NarratoAI",
      "VideoLingo"
    ],
    "status": "待接入",
    "limitations": [
      "声音/克隆/模型权利另核，未自动授权真人声音"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-057",
    "title": "为视频选配音乐并调整混音",
    "description": "合法音乐或生成设置→循环/裁短/音量混音",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "合法音乐或生成设置",
    "output": "循环/裁短/音量混音",
    "candidates": [
      "FireRed-OpenStoryline",
      "NarratoAI",
      "MoneyPrinterTurbo"
    ],
    "status": "待接入",
    "limitations": [
      "代码许可不授予音乐商用权；生成服务另核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-058",
    "title": "让画面按音乐节奏卡点",
    "description": "音乐与片段→节奏编排",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "音乐与片段",
    "output": "节奏编排",
    "candidates": [
      "FireRed-OpenStoryline"
    ],
    "status": "待接入",
    "limitations": [
      "官方声明，样片效果未测；音乐权利另核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-059",
    "title": "按平台画幅导出成片；工程格式按项目另列",
    "description": "成片→横/竖/方形视频；Narrato另有剪映草稿、Auto-Editor另有NLE工程",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "成片",
    "output": "横/竖/方形视频；Narrato另有剪映草稿、Auto-Editor另有NLE工程",
    "candidates": [
      "MoneyPrinterTurbo",
      "NarratoAI",
      "Auto-Editor"
    ],
    "status": "待接入",
    "limitations": [
      "不承诺主体自动不裁切；MP4、剪映草稿与各NLE工程不可互相冒充"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-060",
    "title": "按项目选择批量制作或局部重做（跨项目组合）",
    "description": "V01批量复用生成设置；V07技能复用/多轮修改；V03暂停恢复为可比较子路径",
    "category": "自有视频、字幕、音乐与导出",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "V01批量复用生成设置；V07技能复用/多轮修改；V03暂停恢复为可比较子路径",
    "output": "结果范围待验证",
    "candidates": [
      "MoneyPrinterTurbo",
      "FireRed-OpenStoryline",
      "VideoLingo"
    ],
    "status": "待接入",
    "limitations": [
      "不声称一项目同时支持全部批量、局部重做和恢复；并发/租户仍待核"
    ],
    "evidence": "需组合"
  },
  {
    "id": "FUN-061",
    "title": "将几份经营材料合成一个PDF",
    "description": "多PDF及顺序→一个有序文件",
    "category": "PDF、OCR与归档",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "多PDF及顺序",
    "output": "一个有序文件",
    "candidates": [
      "pdf-lib"
    ],
    "status": "待接入",
    "limitations": [
      "MIT；不是报价生成、Office转换或加密PDF解密"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-062",
    "title": "只取需要的PDF页交材料",
    "description": "页码选择→独立PDF",
    "category": "PDF、OCR与归档",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "页码选择",
    "output": "独立PDF",
    "candidates": [
      "pdf-lib"
    ],
    "status": "待接入",
    "limitations": [
      "不改普通正文，不声称支持加密PDF；中文字体另核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-063",
    "title": "整理扫描PDF页序和方向",
    "description": "错序/倒页与人工选择→整理PDF",
    "category": "PDF、OCR与归档",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "错序/倒页与人工选择",
    "output": "整理PDF",
    "candidates": [
      "pdf-lib"
    ],
    "status": "待接入",
    "limitations": [
      "自动识别倒页/空白页未核；不默认AI或声称自动修正全部"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-064",
    "title": "填好已有交互PDF表格",
    "description": "AcroForm字段与资料→填表PDF",
    "category": "PDF、OCR与归档",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "AcroForm字段与资料",
    "output": "填表PDF",
    "candidates": [
      "pdf-lib"
    ],
    "status": "待接入",
    "limitations": [
      "不是任意扫描表单自动填写，也不含真实外部提交"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-065",
    "title": "给资料副本加店名、水印或页码",
    "description": "PDF与文字→有标记副本",
    "category": "PDF、OCR与归档",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "PDF与文字",
    "output": "有标记副本",
    "candidates": [
      "pdf-lib"
    ],
    "status": "待接入",
    "limitations": [
      "不是安全脱敏、电子签章或防伪；盖白块不能称删掉敏感原文"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-066",
    "title": "压缩图片并比较清晰度",
    "description": "原图/质量设置→压缩图与前后对照",
    "category": "海报、图片处理与修图",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "原图/质量设置",
    "output": "压缩图与前后对照",
    "candidates": [
      "Squoosh"
    ],
    "status": "待接入",
    "limitations": [
      "Apache代码/编解码器另核；关闭未授权遥测；不承诺固定压缩率"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-067",
    "title": "改成上传平台接受的图片格式",
    "description": "原图与格式要求→指定格式文件",
    "category": "海报、图片处理与修图",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "原图与格式要求",
    "output": "指定格式文件",
    "candidates": [
      "Squoosh"
    ],
    "status": "待接入",
    "limitations": [
      "不保证所有原图均更小；透明/有损格式规则说明清楚"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-068",
    "title": "按指定像素准备证件或材料图片",
    "description": "原图与用户给定规格→尺寸文件",
    "category": "海报、图片处理与修图",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "原图与用户给定规格",
    "output": "尺寸文件",
    "candidates": [
      "快图vue-fabric-editor"
    ],
    "status": "待接入",
    "limitations": [
      "不预设一寸/二寸规范，不含自动抠图、人脸定位或官方审核保证"
    ],
    "evidence": "需组合"
  },
  {
    "id": "FUN-069",
    "title": "排可再编辑的海报或价目表",
    "description": "自有图文→PNG/SVG与可再编辑JSON",
    "category": "海报、图片处理与修图",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "自有图文",
    "output": "PNG/SVG与可再编辑JSON",
    "candidates": [
      "快图vue-fabric-editor"
    ],
    "status": "待接入",
    "limitations": [
      "MIT前端；字体/素材需有权；付费后台/批量HTTP出图不包含"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-070",
    "title": "将长页面留成连续截图",
    "description": "本机长页面→拼接图片",
    "category": "截图、二维码与批量标签",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "本机长页面",
    "output": "拼接图片",
    "candidates": [
      "eSearch"
    ],
    "status": "待接入",
    "limitations": [
      "GPL/依赖另核；不让纯网页无权限读取任意桌面"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-071",
    "title": "读出图片中的二维码内容",
    "description": "图片/截图→原始文字或网址",
    "category": "截图、二维码与批量标签",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "图片/截图",
    "output": "原始文字或网址",
    "candidates": [
      "Umi-OCR"
    ],
    "status": "待接入",
    "limitations": [
      "MIT主代码/插件另核；先展示不自动开链接，不当支付或安全认证"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-072",
    "title": "为店铺资料生成二维码",
    "description": "文本/URL→node-qrcode生成PNG/SVG；Umi替代路径生成JPEG Base64",
    "category": "截图、二维码与批量标签",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "文本/URL",
    "output": "node-qrcode生成PNG/SVG；Umi替代路径生成JPEG Base64",
    "candidates": [
      "node-qrcode",
      "Umi-OCR"
    ],
    "status": "待接入",
    "limitations": [
      "MIT主代码；不承诺静态码可更新，不代替收款开户；格式按项目区分"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-073",
    "title": "按商品表批量排可打印标签",
    "description": "表格、标签尺寸→标签页/PDF",
    "category": "截图、二维码与批量标签",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "表格、标签尺寸",
    "output": "标签页/PDF",
    "candidates": [
      "JsBarcode",
      "node-qrcode",
      "快图vue-fabric-editor",
      "pdf-lib"
    ],
    "status": "待接入",
    "limitations": [
      "不把快图付费后台当开源现成；纸张/设备待样张；不同于FUN-007普通商品码"
    ],
    "evidence": "需组合"
  },
  {
    "id": "FUN-074",
    "title": "清理表格空白并规范类型",
    "description": "杂乱列→预览确认的规范明细",
    "category": "Office、表单与表格处理",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "杂乱列",
    "output": "预览确认的规范明细",
    "candidates": [
      "OpenRefine"
    ],
    "status": "待接入",
    "limitations": [
      "BSD；电话号码/前导零保留，失败转换需标出；外部补全未配禁用"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-075",
    "title": "找相似客户或供应商名称供确认",
    "description": "名称列→候选聚类及确认后结果",
    "category": "Office、表单与表格处理",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "名称列",
    "output": "候选聚类及确认后结果",
    "candidates": [
      "OpenRefine"
    ],
    "status": "待接入",
    "limitations": [
      "不自动认定同名公司同一实体，不重复计客户档案维护"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-076",
    "title": "拆开格子里的多项内容",
    "description": "明确分隔符的列→多行/多列",
    "category": "Office、表单与表格处理",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "明确分隔符的列",
    "output": "多行/多列",
    "candidates": [
      "OpenRefine"
    ],
    "status": "待接入",
    "limitations": [
      "不擅自语义猜姓名/地址；空值、分隔符和回退需验证"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-077",
    "title": "将指定工作表转为要求的CSV",
    "description": "XLSX所选表与列序→CSV",
    "category": "Office、表单与表格处理",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "XLSX所选表与列序",
    "output": "CSV",
    "candidates": [
      "Excelize"
    ],
    "status": "待接入",
    "limitations": [
      "BSD；不默默丢公式/日期/前导零或多表选择；不是成品财务应用"
    ],
    "evidence": "需组合"
  },
  {
    "id": "FUN-078",
    "title": "将多份日报并成同一列结构总表",
    "description": "多XLSX与映射规则→合并XLSX",
    "category": "Office、表单与表格处理",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "多XLSX与映射规则",
    "output": "合并XLSX",
    "candidates": [
      "Excelize"
    ],
    "status": "待接入",
    "limitations": [
      "BSD；不是自动会计合并，不重复普通共享台账"
    ],
    "evidence": "需组合"
  },
  {
    "id": "FUN-079",
    "title": "将票据或账单表格变成可核对明细",
    "description": "图片/PDF→表格结构和草稿",
    "category": "PDF、OCR与归档",
    "stage": "收款与经营记录",
    "industry": [
      "通用"
    ],
    "input": "图片/PDF",
    "output": "表格结构和草稿",
    "candidates": [
      "PaddleOCR",
      "Excelize"
    ],
    "status": "待接入",
    "limitations": [
      "代码/权重分别锁；金额和低置信度需复核，不是发票验真、开票或自动记账"
    ],
    "evidence": "需组合"
  },
  {
    "id": "FUN-080",
    "title": "在网页修改Word材料并下载可继续编辑的文档",
    "description": "自有DOCX→改文字/表格/图片后保存并下载DOCX；中文分页/字体差异待样本核对",
    "category": "Office、表单与表格处理",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "自有DOCX",
    "output": "改文字/表格/图片后保存并下载DOCX；中文分页/字体差异待样本核对",
    "candidates": [
      "ONLYOFFICE DocumentServer Community",
      "Collabora Online / CODE"
    ],
    "status": "待接入",
    "limitations": [
      "O01 AGPL/归属声明/子模块字体另核；O02当前CODE构建ref未知；Univer OSS不算DOCX往返已有"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-081",
    "title": "在网页修改Excel数据和公式后下载工作簿",
    "description": "自有XLSX→交互改值/公式/工作表并保存XLSX；日期/前导零/公式/多表兼容待验",
    "category": "Office、表单与表格处理",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "自有XLSX",
    "output": "交互改值/公式/工作表并保存XLSX；日期/前导零/公式/多表兼容待验",
    "candidates": [
      "ONLYOFFICE DocumentServer Community",
      "Collabora Online / CODE"
    ],
    "status": "待接入",
    "limitations": [
      "不是035数据库、077转CSV或078合并；Univer OSS可建内部表格，不证明XLSX导入导出；宏等未核不承诺"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-082",
    "title": "在网页修改演示稿并下载可继续编辑的文件",
    "description": "自有PPTX→修改幻灯片文字/图文排版并保存PPTX；母版/字体/动画兼容范围未测",
    "category": "Office、表单与表格处理",
    "stage": "团队与日常运营",
    "industry": [
      "通用"
    ],
    "input": "自有PPTX",
    "output": "修改幻灯片文字/图文排版并保存PPTX；母版/字体/动画兼容范围未测",
    "candidates": [
      "ONLYOFFICE DocumentServer Community",
      "Collabora Online / CODE"
    ],
    "status": "待接入",
    "limitations": [
      "O01 Community演示编辑器有据，不扩大为AI生成演示、商业Automation或移动编辑；O02当前版本待补"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-083",
    "title": "自动去商品照片背景并检查透明边缘",
    "description": "自有原图→透明PNG、遮罩和原图对照；白底/自有底图为输出选项，不另计任务",
    "category": "海报、图片处理与修图",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "自有原图",
    "output": "透明PNG、遮罩和原图对照；白底/自有底图为输出选项，不另计任务",
    "candidates": [
      "rembg",
      "BiRefNet",
      "transparent-background"
    ],
    "status": "待接入",
    "limitations": [
      "rembg默认BRIA不能直接启用；原作者BiRefNet固定卡MIT但具体权重/hash/骨干需核；IM06权重未决；透明反光/毛发/包装字需样本检查，不等于商品场景生成"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-084",
    "title": "圈出局部杂物并擦除补齐背景",
    "description": "自有图＋用户画笔mask→局部修补候选图，保留原图/撤销；不自动决定删除对象，不保证还原遮挡处真实结构",
    "category": "海报、图片处理与修图",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "自有图＋用户画笔mask",
    "output": "局部修补候选图，保留原图/撤销；不自动决定删除对象，不保证还原遮挡处真实结构",
    "candidates": [
      "IOPaint",
      "LaMa"
    ],
    "status": "待接入",
    "limitations": [
      "IOPaint归档；两者Apache代码不覆盖所有模型，LaMa/第三方转换权重许可及hash未核；不承诺自动去水印或自动扩图"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-085",
    "title": "将小图清晰放大并对照下载",
    "description": "自有低分辨率图＋倍率→超分辨率候选图与对照；保留原件，不是普通插值缩放，也不声称恢复真实细节",
    "category": "海报、图片处理与修图",
    "stage": "宣传与获客",
    "industry": [
      "通用"
    ],
    "input": "自有低分辨率图＋倍率",
    "output": "超分辨率候选图与对照；保留原件，不是普通插值缩放，也不声称恢复真实细节",
    "candidates": [
      "Real-ESRGAN",
      "IOPaint"
    ],
    "status": "待接入",
    "limitations": [
      "BSD代码非官方pth全可商用结论；权重/硬件/样片待核；可能改小字/logo/纹理；额外GFPGAN不默认开"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-086",
    "title": "检查自有网站页面/链接并整理修复清单",
    "description": "授权URL/站点范围→带页面URL、规则、时间和失败状态的标题/描述/状态/死链等报告；单页/全站同一任务",
    "category": "SEO检查、Google排名与发布草稿",
    "stage": "复购与经营复盘",
    "industry": [
      "通用"
    ],
    "input": "授权URL/站点范围",
    "output": "带页面URL、规则、时间和失败状态的标题/描述/状态/死链等报告；单页/全站同一任务",
    "candidates": [
      "Lighthouse",
      "SiteOne Crawler",
      "SEOnaut"
    ],
    "status": "待接入",
    "limitations": [
      "域名授权、私网/云元数据与重定向/子资源出网限制、页数/频率需补；不开放压力测试。SiteOne ai-geo仅准备度细化，AI内容建议另绑定模型/外发，不加GEO保证"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-087",
    "title": "观察限定Google关键词名次变化",
    "description": "自有域名、词、国家/设备/可选城市、周期→Google位置历史与采样条件/失败状态；不承诺上升",
    "category": "SEO检查、Google排名与发布草稿",
    "stage": "复购与经营复盘",
    "industry": [
      "通用"
    ],
    "input": "自有域名、词、国家/设备/可选城市、周期",
    "output": "Google位置历史与采样条件/失败状态；不承诺上升",
    "candidates": [
      "SerpBear"
    ],
    "status": "待接入",
    "limitations": [
      "MIT不覆盖外部服务；不保证旧免费来源有效，不承诺百度/必应/AI引用。提供者/secret/cron由站长控制，无源显示待配置；GSC/Ads授权另核"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-088",
    "title": "为自有公开页生成sitemap与robots草稿",
    "description": "已确认公开URL、真实更新日期和规则→XML/TXT与排除项预览；生成草稿不自动部署/提交",
    "category": "SEO检查、Google排名与发布草稿",
    "stage": "复购与经营复盘",
    "industry": [
      "通用"
    ],
    "input": "已确认公开URL、真实更新日期和规则",
    "output": "XML/TXT与排除项预览；生成草稿不自动部署/提交",
    "candidates": [
      "next-sitemap",
      "SiteOne Crawler"
    ],
    "status": "待接入",
    "limitations": [
      "MIT；私有账号/任务/文件URL不入地图，robots不代替权限；lastmod不伪造。SiteOne原生生成已有，平台封装不额外计组合，不把Next库当任意CMS现成服务"
    ],
    "evidence": "资料已有"
  },
  {
    "id": "FUN-089",
    "title": "将真实企业/商品信息整理为JSON-LD草稿",
    "description": "已确认字段与可见页面内容→可预览JSON/HTML片段、校验错误；用户核对后自行决定发布",
    "category": "SEO检查、Google排名与发布草稿",
    "stage": "复购与经营复盘",
    "industry": [
      "通用"
    ],
    "input": "已确认字段与可见页面内容",
    "output": "可预览JSON/HTML片段、校验错误；用户核对后自行决定发布",
    "candidates": [
      "schema-dts"
    ],
    "status": "待接入",
    "limitations": [
      "Apache代码与Schema.org词汇条款分别核；不编造评价/评分/库存/价格/资质，不是自动完整验证或富结果资格证明；无排名/收录/AI引用保证"
    ],
    "evidence": "需组合"
  }
];
