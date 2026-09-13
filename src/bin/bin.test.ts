import { describe, expect, it } from 'vitest'
import { BANKS, bankTheme } from './banks'
import {
  detectCard,
  detectNetwork,
  formatCardNumber,
  luhnCheck,
  maskCardNumber,
  normalizeDigits,
} from './detect'
import { BIN_TABLE, lookupBin } from './table'

describe('Luhn 校验', () => {
  it('接受合法测试卡号', () => {
    expect(luhnCheck('4111111111111111')).toBe(true)
    expect(luhnCheck('5555555555554444')).toBe(true)
    expect(luhnCheck('378282246310005')).toBe(true)
    expect(luhnCheck('6222021001122337')).toBe(true)
  })

  it('拒绝改动一位后的卡号', () => {
    expect(luhnCheck('4111111111111112')).toBe(false)
    expect(luhnCheck('6222021001122334')).toBe(false)
  })

  it('拒绝非数字输入', () => {
    expect(luhnCheck('4111-1111')).toBe(false)
    expect(luhnCheck('')).toBe(false)
  })
})

describe('卡组织识别', () => {
  it.each([
    ['6222021001122334', 'unionpay'],
    ['4111111111111111', 'visa'],
    ['5555555555554444', 'mastercard'],
    ['2221000000000009', 'mastercard'], // 2221-2720 新段
    ['2720999999999996', 'mastercard'],
    ['378282246310005', 'amex'],
    ['3530111333300000', 'jcb'],
    ['6011111111111117', 'discover'],
    ['1234567890123456', 'unknown'],
  ])('%s → %s', (digits, expected) => {
    expect(detectNetwork(digits)).toBe(expected)
  })

  it('2720 之外的 27xx 不算 Mastercard', () => {
    expect(detectNetwork('2721000000000000')).toBe('unknown')
  })
})

describe('BIN 最长前缀匹配', () => {
  it('命中 6 位标准前缀', () => {
    expect(lookupBin('6225880000000000')?.bank).toBe('cmb')
    expect(lookupBin('4367420000000000')?.bank).toBe('ccb')
    expect(lookupBin('6222000000000000')?.bank).toBe('icbc')
  })

  it('优先匹配更长的前缀而不是短前缀', () => {
    // '103' 是农行短前缀；'1030000...' 应命中它
    expect(lookupBin('1030000000000000')?.bank).toBe('abc')
    // 但 6 位前缀存在时不应被 3 位前缀抢走
    const long = lookupBin('4391880000000000')
    expect(long?.bank).toBe('cmb')
    expect(long?.prefix).toHaveLength(6)
  })

  it('未收录的前缀返回 undefined', () => {
    expect(lookupBin('9999990000000000')).toBeUndefined()
  })

  it('输入短于前缀长度时不误命中', () => {
    expect(lookupBin('62')).toBeUndefined()
  })

  it('表内所有前缀都是纯数字且指向已定义的银行', () => {
    for (const entry of BIN_TABLE) {
      expect(entry.prefix).toMatch(/^\d+$/)
      expect(BANKS[entry.bank]).toBeDefined()
    }
  })
})

describe('detectCard 综合识别', () => {
  it('识别招行借记卡并给出后四位', () => {
    const d = detectCard('6225 8801 2345 6789')
    expect(d.bank).toBe('cmb')
    expect(d.network).toBe('unionpay')
    expect(d.kind).toBe('debit')
    expect(d.last4).toBe('6789')
    expect(d.bin).toBe('622588')
  })

  it('识别建行信用卡', () => {
    const d = detectCard('4367380123456789')
    expect(d.bank).toBe('ccb')
    expect(d.network).toBe('visa')
    expect(d.kind).toBe('credit')
  })

  it('未收录卡号落到 unknown，但卡组织仍可判', () => {
    const d = detectCard('4999990000000000')
    expect(d.bank).toBe('unknown')
    expect(d.network).toBe('visa')
    expect(d.kind).toBeUndefined()
  })

  it('位数不足 13 时 Luhn 结果为 null（不提前报错）', () => {
    expect(detectCard('622588').luhnValid).toBeNull()
    expect(detectCard('4111111111111111').luhnValid).toBe(true)
  })
})

describe('卡号格式化与遮码', () => {
  it('四位一组', () => {
    expect(formatCardNumber('6222021001122334')).toBe('6222 0210 0112 2334')
  })

  it('Amex 走 4-6-5 分组', () => {
    expect(formatCardNumber('378282246310005', 'amex')).toBe('3782 822463 10005')
  })

  it('遮码只保留后四位', () => {
    expect(maskCardNumber('6222021001122334')).toBe('•••• •••• •••• 2334')
  })

  it('短于四位时原样返回', () => {
    expect(maskCardNumber('62')).toBe('62')
  })

  it('normalizeDigits 剥离所有非数字', () => {
    expect(normalizeDigits(' 6222-0210 0112.2334 ')).toBe('6222021001122334')
  })
})

describe('银行主题', () => {
  it('未知 key 落到 unknown 主题', () => {
    expect(bankTheme('not-a-bank').key).toBe('unknown')
    expect(bankTheme(undefined).key).toBe('unknown')
  })

  it('每家银行都有渐变色和前景色', () => {
    for (const theme of Object.values(BANKS)) {
      expect(theme.gradient.length).toBeGreaterThanOrEqual(2)
      for (const c of theme.gradient) expect(c).toMatch(/^#[0-9a-f]{6}$/i)
      expect(theme.foreground).toMatch(/^#[0-9a-f]{6}$/i)
      expect(theme.name).not.toBe('')
    }
  })

  it('正确识别 Bybit、Wise、Revolut 与汇丰等国际/加密卡', () => {
    // Bybit Mastercard
    const bybit = detectCard('5395870012345678')
    expect(bybit.bank).toBe('bybit')
    expect(bybit.network).toBe('mastercard')

    // Wise Visa
    const wise = detectCard('4396540012345678')
    expect(wise.bank).toBe('wise')
    expect(wise.network).toBe('visa')

    // Revolut Mastercard
    const revolut = detectCard('5391230012345678')
    expect(revolut.bank).toBe('revolut')
    expect(revolut.network).toBe('mastercard')

    // 汇丰银行
    const hsbc = detectCard('5412890012345678')
    expect(hsbc.bank).toBe('hsbc')
    expect(hsbc.network).toBe('mastercard')
  })
})

