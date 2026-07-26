import { bankTheme } from '../bin/banks'
import {
  formatCardNumber,
  maskCardNumber,
  NETWORK_LABEL,
  normalizeDigits,
  type CardNetwork,
} from '../bin/detect'
import { CARD_TYPE_LABEL, type CardType } from '../data/types'
import { BankGlyph } from './BankGlyph'
import { NetworkMark } from './NetworkMark'
import './CardFace.css'

/** 点击卡面信息复制时的回调；label 用于 toast 文案。 */
export type CopyFieldHandler = (label: string, value: string) => void

export interface CardFaceProps {
  bankKey: string
  bankName: string
  nickname: string
  network: CardNetwork
  cardType: CardType
  /** 完整卡号（已解密）；未提供时用 last4 拼出遮码 */
  fullNumber?: string
  last4: string
  holder?: string
  expiry?: string
  cvv?: string
  /** true 时显示完整卡号，否则遮码 */
  revealed?: boolean
  colorOverride?: string
  /** 提供后，revealed 状态下卡面信息可点击复制 */
  onCopyField?: CopyFieldHandler
}

/** 把 override 的单色扩成一组有层次的渐变，避免纯色卡面显得扁平。 */
function gradientFor(
  bankKey: string,
  override: string | undefined,
): string {
  if (override) {
    return `linear-gradient(145deg, ${override} 0%, ${shade(override, -0.28)} 58%, ${shade(override, -0.5)} 100%)`
  }
  const stops = bankTheme(bankKey).gradient
  return `linear-gradient(145deg, ${stops.join(', ')})`
}

/** 简易明度调整：amount < 0 变暗，> 0 变亮。 */
function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const num = Number.parseInt(m[1], 16)
  const adjust = (c: number) =>
    Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)
  const r = adjust((num >> 16) & 0xff)
  const g = adjust((num >> 8) & 0xff)
  const b = adjust(num & 0xff)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * 可复制字段：revealed 且传入 onCopy 时渲染成按钮（点击即复制），
 * 否则是普通展示。className 由调用方传，按钮不改变原有排版。
 */
function CopyableText({
  className,
  label,
  value,
  display,
  onCopy,
  ariaLabel,
}: {
  className: string
  label: string
  value: string
  display: React.ReactNode
  onCopy?: CopyFieldHandler
  ariaLabel?: string
}) {
  if (!onCopy || !value) {
    return (
      <div className={className} aria-label={ariaLabel}>
        {display}
      </div>
    )
  }
  return (
    <button
      type="button"
      className={`${className} card-face__copyable`}
      aria-label={`复制${label}`}
      onClick={(e) => {
        // 卡面在列表里可能被套在可点击容器中，复制不应触发外层跳转
        e.stopPropagation()
        onCopy(label, value)
      }}
    >
      {display}
    </button>
  )
}

export function CardFace({
  bankKey,
  bankName,
  nickname,
  network,
  cardType,
  fullNumber,
  last4,
  holder,
  expiry,
  cvv,
  revealed = false,
  colorOverride,
  onCopyField,
}: CardFaceProps) {
  const theme = bankTheme(bankKey)
  const fg = colorOverride ? '#ffffff' : theme.foreground
  const digits = normalizeDigits(fullNumber ?? '')

  // 没有完整卡号时（例如列表里只有 last4），用固定 16 位长度拼遮码
  const numberText = digits
    ? revealed
      ? formatCardNumber(digits, network)
      : maskCardNumber(digits, network)
    : maskCardNumber('•'.repeat(12) + (last4 || '••••'), network)

  const networkLabel = NETWORK_LABEL[network]
  // 只有明文可见时才允许点击复制
  const copy = revealed ? onCopyField : undefined

  return (
    <div
      className="card-face"
      style={{ background: gradientFor(bankKey, colorOverride), color: fg }}
    >
      <div className="card-face__body">
        <div className="card-face__top">
          <div className="card-face__bank">
            <BankGlyph glyph={theme.glyph} color={fg} size={30} />
            <div className="card-face__bank-text">
              <div className="card-face__bank-name">
                {bankName || theme.short}
              </div>
              {nickname && (
                <div className="card-face__nickname">{nickname}</div>
              )}
            </div>
          </div>
          <span className="card-face__badge">{CARD_TYPE_LABEL[cardType]}</span>
        </div>

        <div className="card-face__chip" aria-hidden="true" />

        <CopyableText
          className={`card-face__number${revealed ? ' selectable' : ''}`}
          label="卡号"
          value={digits}
          display={numberText}
          onCopy={copy}
          ariaLabel={revealed ? '完整卡号' : '卡号已遮码'}
        />

        <div className="card-face__bottom">
          <CopyableText
            className="card-face__holder"
            label="持卡人"
            value={holder ?? ''}
            display={holder || ' '}
            onCopy={copy}
          />
          <div className="card-face__meta">
            {revealed && cvv && (
              <CopyableText
                className="card-face__cvv"
                label="安全码"
                value={cvv}
                display={
                  <>
                    <span className="card-face__meta-label">CVV</span>
                    {cvv}
                  </>
                }
                onCopy={copy}
              />
            )}
            {expiry && (
              <CopyableText
                className="card-face__expiry"
                label="有效期"
                value={expiry}
                display={expiry}
                onCopy={copy}
              />
            )}
            <NetworkMark network={network} color={fg} />
          </div>
        </div>
      </div>
      {networkLabel && <span className="sr-only">{networkLabel}</span>}
    </div>
  )
}
