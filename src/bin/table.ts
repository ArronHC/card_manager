import type { BankKey } from './banks'

/**
 * BIN 前缀表（社区整理数据，覆盖国内常见发卡行的主力卡段）。
 *
 * 匹配采用「最长前缀」而非固定截取 6 位：部分银行（尤其村镇银行）的 BIN
 * 长达 8-9 位，固定 6 位会误判到别家。表本身不追求穷尽，识别不出来时
 * 用户可以在表单里手动选行，功能不受影响。
 */

export type CardKind = 'debit' | 'credit'

export interface BinEntry {
  prefix: string
  bank: BankKey
  kind: CardKind
}

export const BIN_TABLE: BinEntry[] = [
  // ── 工商银行 ─────────────────────────────────────────
  { prefix: '620302', bank: 'icbc', kind: 'debit' },
  { prefix: '620402', bank: 'icbc', kind: 'debit' },
  { prefix: '620403', bank: 'icbc', kind: 'debit' },
  { prefix: '620404', bank: 'icbc', kind: 'debit' },
  { prefix: '620406', bank: 'icbc', kind: 'debit' },
  { prefix: '621226', bank: 'icbc', kind: 'debit' },
  { prefix: '621558', bank: 'icbc', kind: 'debit' },
  { prefix: '621559', bank: 'icbc', kind: 'debit' },
  { prefix: '622200', bank: 'icbc', kind: 'debit' },
  { prefix: '622202', bank: 'icbc', kind: 'debit' },
  { prefix: '622203', bank: 'icbc', kind: 'debit' },
  { prefix: '622208', bank: 'icbc', kind: 'debit' },
  { prefix: '955880', bank: 'icbc', kind: 'debit' },
  { prefix: '402791', bank: 'icbc', kind: 'credit' },
  { prefix: '427010', bank: 'icbc', kind: 'credit' },
  { prefix: '427062', bank: 'icbc', kind: 'credit' },
  { prefix: '438125', bank: 'icbc', kind: 'credit' },
  { prefix: '438126', bank: 'icbc', kind: 'credit' },
  { prefix: '451804', bank: 'icbc', kind: 'credit' },
  { prefix: '524091', bank: 'icbc', kind: 'credit' },
  { prefix: '622230', bank: 'icbc', kind: 'credit' },
  { prefix: '622235', bank: 'icbc', kind: 'credit' },
  { prefix: '622245', bank: 'icbc', kind: 'credit' },
  { prefix: '625247', bank: 'icbc', kind: 'credit' },

  // ── 农业银行 ─────────────────────────────────────────
  { prefix: '622821', bank: 'abc', kind: 'debit' },
  { prefix: '622822', bank: 'abc', kind: 'debit' },
  { prefix: '622823', bank: 'abc', kind: 'debit' },
  { prefix: '622824', bank: 'abc', kind: 'debit' },
  { prefix: '622826', bank: 'abc', kind: 'debit' },
  { prefix: '622848', bank: 'abc', kind: 'debit' },
  { prefix: '621282', bank: 'abc', kind: 'debit' },
  { prefix: '103', bank: 'abc', kind: 'debit' },
  { prefix: '404117', bank: 'abc', kind: 'credit' },
  { prefix: '404118', bank: 'abc', kind: 'credit' },
  { prefix: '519412', bank: 'abc', kind: 'credit' },
  { prefix: '622836', bank: 'abc', kind: 'credit' },
  { prefix: '622840', bank: 'abc', kind: 'credit' },
  { prefix: '628268', bank: 'abc', kind: 'credit' },

  // ── 中国银行 ─────────────────────────────────────────
  { prefix: '621660', bank: 'boc', kind: 'debit' },
  { prefix: '621661', bank: 'boc', kind: 'debit' },
  { prefix: '621663', bank: 'boc', kind: 'debit' },
  { prefix: '456351', bank: 'boc', kind: 'debit' },
  { prefix: '601382', bank: 'boc', kind: 'debit' },
  { prefix: '621256', bank: 'boc', kind: 'debit' },
  { prefix: '622752', bank: 'boc', kind: 'debit' },
  { prefix: '622753', bank: 'boc', kind: 'debit' },
  { prefix: '622755', bank: 'boc', kind: 'debit' },
  { prefix: '622760', bank: 'boc', kind: 'debit' },
  { prefix: '409665', bank: 'boc', kind: 'credit' },
  { prefix: '409666', bank: 'boc', kind: 'credit' },
  { prefix: '438088', bank: 'boc', kind: 'credit' },
  { prefix: '514957', bank: 'boc', kind: 'credit' },
  { prefix: '622788', bank: 'boc', kind: 'credit' },
  { prefix: '628388', bank: 'boc', kind: 'credit' },

  // ── 建设银行 ─────────────────────────────────────────
  { prefix: '436742', bank: 'ccb', kind: 'debit' },
  { prefix: '434061', bank: 'ccb', kind: 'debit' },
  { prefix: '434062', bank: 'ccb', kind: 'debit' },
  { prefix: '621700', bank: 'ccb', kind: 'debit' },
  { prefix: '622280', bank: 'ccb', kind: 'debit' },
  { prefix: '622700', bank: 'ccb', kind: 'debit' },
  { prefix: '622707', bank: 'ccb', kind: 'debit' },
  { prefix: '622725', bank: 'ccb', kind: 'debit' },
  { prefix: '589970', bank: 'ccb', kind: 'debit' },
  { prefix: '436718', bank: 'ccb', kind: 'credit' },
  { prefix: '436728', bank: 'ccb', kind: 'credit' },
  { prefix: '436738', bank: 'ccb', kind: 'credit' },
  { prefix: '544887', bank: 'ccb', kind: 'credit' },
  { prefix: '552245', bank: 'ccb', kind: 'credit' },
  { prefix: '622166', bank: 'ccb', kind: 'credit' },
  { prefix: '624458', bank: 'ccb', kind: 'credit' },
  { prefix: '628288', bank: 'ccb', kind: 'credit' },

  // ── 交通银行 ─────────────────────────────────────────
  { prefix: '622260', bank: 'bocom', kind: 'debit' },
  { prefix: '622261', bank: 'bocom', kind: 'debit' },
  { prefix: '622262', bank: 'bocom', kind: 'debit' },
  { prefix: '621002', bank: 'bocom', kind: 'debit' },
  { prefix: '405512', bank: 'bocom', kind: 'credit' },
  { prefix: '458123', bank: 'bocom', kind: 'credit' },
  { prefix: '521899', bank: 'bocom', kind: 'credit' },
  { prefix: '622250', bank: 'bocom', kind: 'credit' },
  { prefix: '622251', bank: 'bocom', kind: 'credit' },
  { prefix: '628216', bank: 'bocom', kind: 'credit' },

  // ── 邮储银行 ─────────────────────────────────────────
  { prefix: '622188', bank: 'psbc', kind: 'debit' },
  { prefix: '621096', bank: 'psbc', kind: 'debit' },
  { prefix: '621599', bank: 'psbc', kind: 'debit' },
  { prefix: '955100', bank: 'psbc', kind: 'debit' },
  { prefix: '622150', bank: 'psbc', kind: 'credit' },
  { prefix: '622151', bank: 'psbc', kind: 'credit' },
  { prefix: '628310', bank: 'psbc', kind: 'credit' },

  // ── 招商银行 ─────────────────────────────────────────
  { prefix: '622588', bank: 'cmb', kind: 'debit' },
  { prefix: '621286', bank: 'cmb', kind: 'debit' },
  { prefix: '621483', bank: 'cmb', kind: 'debit' },
  { prefix: '621485', bank: 'cmb', kind: 'debit' },
  { prefix: '621486', bank: 'cmb', kind: 'debit' },
  { prefix: '95555', bank: 'cmb', kind: 'debit' },
  { prefix: '439188', bank: 'cmb', kind: 'credit' },
  { prefix: '439225', bank: 'cmb', kind: 'credit' },
  { prefix: '439226', bank: 'cmb', kind: 'credit' },
  { prefix: '518710', bank: 'cmb', kind: 'credit' },
  { prefix: '552534', bank: 'cmb', kind: 'credit' },
  { prefix: '622575', bank: 'cmb', kind: 'credit' },
  { prefix: '622576', bank: 'cmb', kind: 'credit' },
  { prefix: '622577', bank: 'cmb', kind: 'credit' },
  { prefix: '622579', bank: 'cmb', kind: 'credit' },
  { prefix: '628362', bank: 'cmb', kind: 'credit' },

  // ── 中信银行 ─────────────────────────────────────────
  { prefix: '622690', bank: 'citic', kind: 'debit' },
  { prefix: '622691', bank: 'citic', kind: 'debit' },
  { prefix: '622696', bank: 'citic', kind: 'debit' },
  { prefix: '621771', bank: 'citic', kind: 'debit' },
  { prefix: '433666', bank: 'citic', kind: 'credit' },
  { prefix: '442729', bank: 'citic', kind: 'credit' },
  { prefix: '518212', bank: 'citic', kind: 'credit' },
  { prefix: '556617', bank: 'citic', kind: 'credit' },
  { prefix: '622680', bank: 'citic', kind: 'credit' },
  { prefix: '628206', bank: 'citic', kind: 'credit' },

  // ── 光大银行 ─────────────────────────────────────────
  { prefix: '622655', bank: 'ceb', kind: 'debit' },
  { prefix: '622650', bank: 'ceb', kind: 'debit' },
  { prefix: '622658', bank: 'ceb', kind: 'debit' },
  { prefix: '621489', bank: 'ceb', kind: 'debit' },
  { prefix: '356837', bank: 'ceb', kind: 'credit' },
  { prefix: '406254', bank: 'ceb', kind: 'credit' },
  { prefix: '486497', bank: 'ceb', kind: 'credit' },
  { prefix: '622660', bank: 'ceb', kind: 'credit' },
  { prefix: '628201', bank: 'ceb', kind: 'credit' },

  // ── 浦发银行 ─────────────────────────────────────────
  { prefix: '622521', bank: 'spdb', kind: 'debit' },
  { prefix: '622522', bank: 'spdb', kind: 'debit' },
  { prefix: '621351', bank: 'spdb', kind: 'debit' },
  { prefix: '498451', bank: 'spdb', kind: 'credit' },
  { prefix: '515672', bank: 'spdb', kind: 'credit' },
  { prefix: '622516', bank: 'spdb', kind: 'credit' },
  { prefix: '622518', bank: 'spdb', kind: 'credit' },
  { prefix: '628221', bank: 'spdb', kind: 'credit' },

  // ── 民生银行 ─────────────────────────────────────────
  { prefix: '622615', bank: 'cmbc', kind: 'debit' },
  { prefix: '622616', bank: 'cmbc', kind: 'debit' },
  { prefix: '622622', bank: 'cmbc', kind: 'debit' },
  { prefix: '621691', bank: 'cmbc', kind: 'debit' },
  { prefix: '415599', bank: 'cmbc', kind: 'credit' },
  { prefix: '421869', bank: 'cmbc', kind: 'credit' },
  { prefix: '512466', bank: 'cmbc', kind: 'credit' },
  { prefix: '622600', bank: 'cmbc', kind: 'credit' },
  { prefix: '628258', bank: 'cmbc', kind: 'credit' },

  // ── 兴业银行 ─────────────────────────────────────────
  { prefix: '622908', bank: 'cib', kind: 'debit' },
  { prefix: '622909', bank: 'cib', kind: 'debit' },
  { prefix: '621352', bank: 'cib', kind: 'debit' },
  { prefix: '438588', bank: 'cib', kind: 'credit' },
  { prefix: '451289', bank: 'cib', kind: 'credit' },
  { prefix: '523036', bank: 'cib', kind: 'credit' },
  { prefix: '622902', bank: 'cib', kind: 'credit' },
  { prefix: '628212', bank: 'cib', kind: 'credit' },

  // ── 平安银行 ─────────────────────────────────────────
  { prefix: '622155', bank: 'pingan', kind: 'debit' },
  { prefix: '622156', bank: 'pingan', kind: 'debit' },
  { prefix: '621626', bank: 'pingan', kind: 'debit' },
  { prefix: '412963', bank: 'pingan', kind: 'credit' },
  { prefix: '456418', bank: 'pingan', kind: 'credit' },
  { prefix: '528020', bank: 'pingan', kind: 'credit' },
  { prefix: '622525', bank: 'pingan', kind: 'credit' },
  { prefix: '622526', bank: 'pingan', kind: 'credit' },
  { prefix: '628296', bank: 'pingan', kind: 'credit' },

  // ── 广发银行 ─────────────────────────────────────────
  { prefix: '622568', bank: 'gdb', kind: 'debit' },
  { prefix: '621462', bank: 'gdb', kind: 'debit' },
  { prefix: '9111', bank: 'gdb', kind: 'debit' },
  { prefix: '436768', bank: 'gdb', kind: 'credit' },
  { prefix: '491032', bank: 'gdb', kind: 'credit' },
  { prefix: '520152', bank: 'gdb', kind: 'credit' },
  { prefix: '622555', bank: 'gdb', kind: 'credit' },
  { prefix: '628260', bank: 'gdb', kind: 'credit' },

  // ── 华夏银行 ─────────────────────────────────────────
  { prefix: '622630', bank: 'hxb', kind: 'debit' },
  { prefix: '622631', bank: 'hxb', kind: 'debit' },
  { prefix: '621222', bank: 'hxb', kind: 'debit' },
  { prefix: '523959', bank: 'hxb', kind: 'credit' },
  { prefix: '528709', bank: 'hxb', kind: 'credit' },
  { prefix: '622637', bank: 'hxb', kind: 'credit' },
  { prefix: '628318', bank: 'hxb', kind: 'credit' },

  // ── 城商行 ───────────────────────────────────────────
  { prefix: '622760', bank: 'bob', kind: 'debit' },
  { prefix: '621418', bank: 'bob', kind: 'debit' },
  { prefix: '602969', bank: 'bob', kind: 'debit' },
  { prefix: '622188', bank: 'bob', kind: 'credit' },
  { prefix: '621456', bank: 'bosc', kind: 'debit' },
  { prefix: '622892', bank: 'bosc', kind: 'debit' },
  { prefix: '622346', bank: 'bosc', kind: 'debit' },
  { prefix: '622323', bank: 'njcb', kind: 'debit' },
  { prefix: '622885', bank: 'njcb', kind: 'debit' },
  { prefix: '621259', bank: 'njcb', kind: 'debit' },

  // ── 境外与加密卡机构 ─────────────────────────────────
  // Bybit Card (Mastercard)
  { prefix: '539587', bank: 'bybit', kind: 'debit' },
  { prefix: '539588', bank: 'bybit', kind: 'debit' },
  { prefix: '540507', bank: 'bybit', kind: 'debit' },
  { prefix: '516488', bank: 'bybit', kind: 'debit' },
  { prefix: '526889', bank: 'bybit', kind: 'credit' },
  { prefix: '540098', bank: 'bybit', kind: 'debit' },

  // Wise (Visa / Mastercard)
  { prefix: '439654', bank: 'wise', kind: 'debit' },
  { prefix: '549627', bank: 'wise', kind: 'debit' },
  { prefix: '531993', bank: 'wise', kind: 'debit' },
  { prefix: '516289', bank: 'wise', kind: 'debit' },

  // Revolut (Mastercard / Visa)
  { prefix: '539123', bank: 'revolut', kind: 'debit' },
  { prefix: '516839', bank: 'revolut', kind: 'debit' },
  { prefix: '459654', bank: 'revolut', kind: 'debit' },

  // 汇丰银行 (HSBC)
  { prefix: '541289', bank: 'hsbc', kind: 'credit' },
  { prefix: '401318', bank: 'hsbc', kind: 'credit' },
  { prefix: '622985', bank: 'hsbc', kind: 'debit' },

  // 花旗银行 (Citi)
  { prefix: '412800', bank: 'citi', kind: 'credit' },
  { prefix: '542418', bank: 'citi', kind: 'credit' },
  { prefix: '622998', bank: 'citi', kind: 'debit' },
]

/**
 * 预编译成前缀 → 条目的 Map，并记录出现过的前缀长度（降序）。
 * 查询时按长度从长到短试一次即可，无需遍历整表。
 */
const BY_PREFIX = new Map<string, BinEntry>()
for (const entry of BIN_TABLE) {
  // 同一前缀重复出现时以先出现的为准（表内 622188/622760 存在跨行重叠）
  if (!BY_PREFIX.has(entry.prefix)) BY_PREFIX.set(entry.prefix, entry)
}

const PREFIX_LENGTHS = [...new Set(BIN_TABLE.map((e) => e.prefix.length))].sort(
  (a, b) => b - a,
)

/** 最长前缀匹配。无命中返回 undefined。 */
export function lookupBin(digits: string): BinEntry | undefined {
  for (const len of PREFIX_LENGTHS) {
    if (digits.length < len) continue
    const hit = BY_PREFIX.get(digits.slice(0, len))
    if (hit) return hit
  }
  return undefined
}
