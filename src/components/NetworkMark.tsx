import type { CardNetwork } from '../bin/detect'

/**
 * 卡组织标记。同样不用官方 logo：银联/JCB 等用文字标，
 * Visa/Mastercard/Amex 用它们各自最具辨识度的抽象形（双圆、方块），
 * 都是通用图形而非商标图案。
 */
export function NetworkMark({
  network,
  color,
}: {
  network: CardNetwork
  color: string
}) {
  if (network === 'unknown') return null

  if (network === 'mastercard') {
    return (
      <svg width="40" height="26" viewBox="0 0 40 26" aria-label="Mastercard">
        <circle cx="15" cy="13" r="9" fill={color} opacity="0.85" />
        <circle cx="25" cy="13" r="9" fill={color} opacity="0.45" />
      </svg>
    )
  }

  const label =
    network === 'unionpay'
      ? 'UnionPay'
      : network === 'visa'
        ? 'VISA'
        : network === 'amex'
          ? 'AMEX'
          : network === 'jcb'
            ? 'JCB'
            : 'DISCOVER'

  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: network === 'visa' ? '0.14em' : '0.06em',
        fontStyle: network === 'visa' ? 'italic' : 'normal',
        color,
        opacity: 0.9,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  )
}
