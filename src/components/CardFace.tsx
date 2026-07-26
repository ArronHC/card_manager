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
  /** true 时显示完整卡号，否则遮码 */
  revealed?: boolean
  colorOverride?: string
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
  revealed = false,
  colorOverride,
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

        <div
          className={`card-face__number${revealed ? ' selectable' : ''}`}
          aria-label={revealed ? '完整卡号' : '卡号已遮码'}
        >
          {numberText}
        </div>

        <div className="card-face__bottom">
          <div className="card-face__holder">
            {holder || ' '}
            {expiry ? '' : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {expiry && <span className="card-face__expiry">{expiry}</span>}
            <NetworkMark network={network} color={fg} />
          </div>
        </div>
      </div>
      {networkLabel && <span className="sr-only">{networkLabel}</span>}
    </div>
  )
}
