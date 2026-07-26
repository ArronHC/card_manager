import type { BankKey } from './banks'
import { lookupBin } from './table'

export type CardNetwork =
  | 'unionpay'
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'jcb'
  | 'discover'
  | 'unknown'

export const NETWORK_LABEL: Record<CardNetwork, string> = {
  unionpay: '银联',
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'American Express',
  jcb: 'JCB',
  discover: 'Discover',
  unknown: '',
}

export interface Detection {
  bank: BankKey
  network: CardNetwork
  /** BIN 表命中的卡类型；未命中为 undefined，由用户自选 */
  kind?: 'debit' | 'credit'
  /** 用于卡面匹配的前缀（命中长度，或前 6 位） */
  bin: string
  last4: string
  /** 只对已知长度、且属于走 Luhn 的卡组织时才有意义 */
  luhnValid: boolean | null
}

/** 去掉空格与短横，只留数字。 */
export function normalizeDigits(input: string): string {
  return input.replace(/\D+/g, '')
}

/** 按卡组织分组显示：Amex 是 4-6-5，其余 4 位一组。 */
export function formatCardNumber(
  digits: string,
  network: CardNetwork = 'unknown',
): string {
  if (network === 'amex') {
    const parts = [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
    return parts.filter(Boolean).join(' ')
  }
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

/** 遮码显示：仅保留后四位，前面按原分组长度补圆点。 */
export function maskCardNumber(
  digits: string,
  network: CardNetwork = 'unknown',
): string {
  if (digits.length <= 4) return digits
  const masked = '•'.repeat(digits.length - 4) + digits.slice(-4)
  return formatCardNumber(masked, network)
}

export function detectNetwork(digits: string): CardNetwork {
  if (!digits) return 'unknown'
  if (/^62/.test(digits)) return 'unionpay'
  if (/^4/.test(digits)) return 'visa'
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^35/.test(digits)) return 'jcb'
  if (/^(6011|65)/.test(digits)) return 'discover'
  if (/^5[1-5]/.test(digits)) return 'mastercard'
  // Mastercard 2016 年起启用的 2221-2720 段
  if (digits.length >= 4) {
    const head = Number(digits.slice(0, 4))
    if (head >= 2221 && head <= 2720) return 'mastercard'
  }
  return 'unknown'
}

/** Luhn 校验（模 10）。空串或含非数字一律 false。 */
export function luhnCheck(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = digits.charCodeAt(i) - 48
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

/**
 * 主入口：从（可能带空格的）卡号识别发卡行、卡组织与卡类型。
 *
 * Luhn 只在位数足够（≥13）时才判定；位数不足时返回 null 表示「还不能下结论」，
 * 避免用户边输入边看到红色报错。
 */
export function detectCard(input: string): Detection {
  const digits = normalizeDigits(input)
  const hit = lookupBin(digits)
  const network = detectNetwork(digits)
  return {
    bank: hit?.bank ?? ('unknown' as BankKey),
    network,
    kind: hit?.kind,
    bin: hit ? digits.slice(0, hit.prefix.length) : digits.slice(0, 6),
    last4: digits.slice(-4),
    luhnValid: digits.length >= 13 ? luhnCheck(digits) : null,
  }
}
