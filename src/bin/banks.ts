/**
 * 发卡行定义与品牌视觉。
 *
 * 标识一律用自绘几何图形（glyph），不使用真实银行 logo —— 规避商标问题，
 * 同时避免为几十家银行内置位图资源。
 */

export type BankKey =
  | 'icbc'
  | 'abc'
  | 'boc'
  | 'ccb'
  | 'bocom'
  | 'psbc'
  | 'cmb'
  | 'citic'
  | 'ceb'
  | 'spdb'
  | 'cmbc'
  | 'cib'
  | 'pingan'
  | 'gdb'
  | 'hxb'
  | 'bob'
  | 'bosc'
  | 'njcb'
  | 'unknown'

/** 卡面几何标识的形状族。CardFace 据此绘制 SVG。 */
export type Glyph =
  | 'concentric' // 同心环
  | 'chevron' // 折角
  | 'diamond' // 菱形
  | 'arc' // 弧线
  | 'grid' // 网格
  | 'wave' // 波纹
  | 'bars' // 竖条
  | 'orbit' // 轨道
  | 'hex' // 六边形
  | 'blade' // 斜切

export interface BankTheme {
  key: BankKey
  name: string
  short: string
  /** 卡面渐变的两到三个停靠色 */
  gradient: [string, string] | [string, string, string]
  /** 卡面上文字/标识的前景色 */
  foreground: string
  glyph: Glyph
}

/**
 * 品牌色取自各行主视觉的近似值，并统一压暗到适合深色卡面的明度区间，
 * 保证白色前景在其上的对比度可读。
 */
export const BANKS: Record<BankKey, BankTheme> = {
  icbc: {
    key: 'icbc',
    name: '中国工商银行',
    short: '工商银行',
    gradient: ['#8e1220', '#c22032', '#5c0a15'],
    foreground: '#fff6f2',
    glyph: 'concentric',
  },
  abc: {
    key: 'abc',
    name: '中国农业银行',
    short: '农业银行',
    gradient: ['#0d5c3a', '#18926a', '#063523'],
    foreground: '#f0fff8',
    glyph: 'wave',
  },
  boc: {
    key: 'boc',
    name: '中国银行',
    short: '中国银行',
    gradient: ['#8c1226', '#b8283c', '#4d0a14'],
    foreground: '#fff4f4',
    glyph: 'orbit',
  },
  ccb: {
    key: 'ccb',
    name: '中国建设银行',
    short: '建设银行',
    gradient: ['#12386e', '#1f5ba8', '#0a2145'],
    foreground: '#f2f8ff',
    glyph: 'chevron',
  },
  bocom: {
    key: 'bocom',
    name: '交通银行',
    short: '交通银行',
    gradient: ['#0f4c73', '#1b7fa8', '#082c44'],
    foreground: '#f0fbff',
    glyph: 'arc',
  },
  psbc: {
    key: 'psbc',
    name: '中国邮政储蓄银行',
    short: '邮储银行',
    gradient: ['#0b5c33', '#13894c', '#053420'],
    foreground: '#f2fff6',
    glyph: 'diamond',
  },
  cmb: {
    key: 'cmb',
    name: '招商银行',
    short: '招商银行',
    gradient: ['#9c1220', '#d0303a', '#5e0a12'],
    foreground: '#fff5f4',
    glyph: 'blade',
  },
  citic: {
    key: 'citic',
    name: '中信银行',
    short: '中信银行',
    gradient: ['#8f1a24', '#c33741', '#4f0e14'],
    foreground: '#fff5f5',
    glyph: 'bars',
  },
  ceb: {
    key: 'ceb',
    name: '中国光大银行',
    short: '光大银行',
    gradient: ['#6f1d8c', '#a038bf', '#3d0f4f'],
    foreground: '#fbf3ff',
    glyph: 'concentric',
  },
  spdb: {
    key: 'spdb',
    name: '上海浦东发展银行',
    short: '浦发银行',
    gradient: ['#0d4f5c', '#158193', '#062e36'],
    foreground: '#effcff',
    glyph: 'grid',
  },
  cmbc: {
    key: 'cmbc',
    name: '中国民生银行',
    short: '民生银行',
    gradient: ['#1c5a4a', '#2e9179', '#0e3128'],
    foreground: '#f0fffa',
    glyph: 'hex',
  },
  cib: {
    key: 'cib',
    name: '兴业银行',
    short: '兴业银行',
    gradient: ['#1b3f79', '#2a68b5', '#0d2246'],
    foreground: '#f2f7ff',
    glyph: 'diamond',
  },
  pingan: {
    key: 'pingan',
    name: '平安银行',
    short: '平安银行',
    gradient: ['#b8540f', '#e08128', '#6b300a'],
    foreground: '#fffaf2',
    glyph: 'arc',
  },
  gdb: {
    key: 'gdb',
    name: '广发银行',
    short: '广发银行',
    gradient: ['#8a1520', '#bf2c38', '#4c0b11'],
    foreground: '#fff5f5',
    glyph: 'chevron',
  },
  hxb: {
    key: 'hxb',
    name: '华夏银行',
    short: '华夏银行',
    gradient: ['#a02a1c', '#cf4a33', '#571610'],
    foreground: '#fff6f3',
    glyph: 'blade',
  },
  bob: {
    key: 'bob',
    name: '北京银行',
    short: '北京银行',
    gradient: ['#1d4a80', '#2d76bd', '#0e2848'],
    foreground: '#f2f8ff',
    glyph: 'orbit',
  },
  bosc: {
    key: 'bosc',
    name: '上海银行',
    short: '上海银行',
    gradient: ['#123f63', '#1e6b9c', '#08243a'],
    foreground: '#f0f9ff',
    glyph: 'wave',
  },
  njcb: {
    key: 'njcb',
    name: '南京银行',
    short: '南京银行',
    gradient: ['#134a4e', '#1f7d84', '#082a2c'],
    foreground: '#f0fdff',
    glyph: 'grid',
  },
  unknown: {
    key: 'unknown',
    name: '其他或境外发卡行',
    short: '其他 / 境外银行',
    gradient: ['#2a2a33', '#43434f', '#17171d'],
    foreground: '#f5f5f7',
    glyph: 'grid',
  },
}

/** 供表单「手动选择发卡行」下拉使用，unknown 排在最后。 */
export const BANK_OPTIONS: BankTheme[] = [
  ...Object.values(BANKS).filter((b) => b.key !== 'unknown'),
  BANKS.unknown,
]

export function bankTheme(key: string | undefined): BankTheme {
  if (key && key in BANKS) return BANKS[key as BankKey]
  return BANKS.unknown
}
