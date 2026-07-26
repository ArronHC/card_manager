import { useEffect, useMemo, useRef, useState } from 'react'
import { BANK_OPTIONS, bankTheme } from '../bin/banks'
import {
  detectCard,
  formatCardNumber,
  NETWORK_LABEL,
  normalizeDigits,
} from '../bin/detect'
import { lookupIssuer } from '../bin/issuerLookup'
import { CARD_TYPE_LABEL, EMPTY_SECRET, type Card, type CardDraft, type CardType } from '../data/types'
import { tapLight } from '../ui/haptics'
import { CardFace } from './CardFace'
import { Sheet } from './ui/Sheet'
import './CardForm.css'

/** 自定义卡面色，用户想脱离银行品牌色时用。 */
const SWATCHES = [
  '#1f5ba8',
  '#c22032',
  '#18926a',
  '#a038bf',
  '#e08128',
  '#158193',
  '#3a3a44',
]

function emptyDraft(): CardDraft {
  return {
    nickname: '',
    bankKey: 'unknown',
    bankName: '',
    cardType: 'debit',
    tags: [],
    colorOverride: undefined,
    secret: { ...EMPTY_SECRET },
  }
}

function draftFrom(card: Card): CardDraft {
  return {
    id: card.id,
    nickname: card.nickname,
    bankKey: card.bankKey,
    bankName: card.bankName,
    cardType: card.cardType,
    tags: [...card.tags],
    colorOverride: card.colorOverride,
    secret: { ...card.secret },
  }
}

export function CardForm({
  open,
  editing,
  knownTags,
  onClose,
  onSubmit,
}: {
  open: boolean
  /** 传入则为编辑模式 */
  editing: Card | null
  knownTags: string[]
  onClose: () => void
  onSubmit: (draft: CardDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<CardDraft>(emptyDraft)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  /** 用户手动改过发卡行后就不再被 BIN 识别覆盖 */
  const [bankLocked, setBankLocked] = useState(false)
  const [issuerHint, setIssuerHint] = useState('')
  const [issuerLoading, setIssuerLoading] = useState(false)
  const lookupSequence = useRef(0)
  const automaticIin = useRef('')

  useEffect(() => {
    if (!open) return
    const next = editing ? draftFrom(editing) : emptyDraft()
    setDraft(next)
    setTagInput('')
    const hasCustomIssuer =
      Boolean(editing) &&
      editing?.bankKey === 'unknown' &&
      Boolean(editing.bankName) &&
      editing.bankName !== '未识别' &&
      editing.bankName !== bankTheme('unknown').short
    setBankLocked(
      Boolean(editing) && (editing!.bankKey !== 'unknown' || hasCustomIssuer),
    )
    setIssuerHint('')
    setIssuerLoading(false)
    automaticIin.current = ''
    lookupSequence.current += 1
  }, [open, editing])

  const digits = normalizeDigits(draft.secret.fullNumber)
  const detection = useMemo(() => detectCard(digits), [digits])

  // 输入卡号时自动套用识别到的发卡行与卡类型（除非用户已手动指定）
  useEffect(() => {
    if (bankLocked || detection.bank === 'unknown') return
    const theme = bankTheme(detection.bank)
    setIssuerHint('')
    setIssuerLoading(false)
    automaticIin.current = digits.slice(0, 8)
    setDraft((prev) => {
      if (prev.bankKey === detection.bank) return prev
      return {
        ...prev,
        bankKey: detection.bank,
        bankName: theme.short,
        cardType: detection.kind ?? prev.cardType,
      }
    })
  }, [detection.bank, detection.kind, bankLocked, digits])

  // 国内表未命中时，仅把前 8 位 IIN 发给联网识别服务。
  useEffect(() => {
    const iin = digits.slice(0, 8)
    if (!open || bankLocked || detection.bank !== 'unknown' || iin.length < 8) {
      setIssuerLoading(false)
      if (iin.length < 8) setIssuerHint('')
      return
    }
    if (automaticIin.current === iin && draft.bankName) return

    const sequence = ++lookupSequence.current
    const timer = window.setTimeout(() => {
      setIssuerLoading(true)
      setIssuerHint('')
      void lookupIssuer(iin).then((result) => {
        if (sequence !== lookupSequence.current || digits.slice(0, 8) !== result.iin) return
        setIssuerLoading(false)
        if (result.status !== 'found') {
          setIssuerHint(result.message)
          return
        }
        automaticIin.current = result.iin
        setIssuerHint(
          result.countryName ? `发卡国家/地区：${result.countryName}` : '',
        )
        setDraft((prev) => ({
          ...prev,
          bankKey: 'unknown',
          bankName: result.bankName,
          cardType: result.cardType ?? prev.cardType,
        }))
      })
    }, 600)

    return () => {
      window.clearTimeout(timer)
      if (sequence === lookupSequence.current) lookupSequence.current += 1
    }
  }, [bankLocked, detection.bank, digits, draft.bankName, open])

  const set = <K extends keyof CardDraft>(key: K, value: CardDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const setSecret = <K extends keyof CardDraft['secret']>(
    key: K,
    value: CardDraft['secret'][K],
  ) => setDraft((prev) => ({ ...prev, secret: { ...prev.secret, [key]: value } }))

  const addTag = (raw: string) => {
    const tag = raw.trim()
    if (!tag || draft.tags.includes(tag)) {
      setTagInput('')
      return
    }
    set('tags', [...draft.tags, tag])
    setTagInput('')
    tapLight()
  }

  const changeCardNumber = (value: string) => {
    const nextDigits = normalizeDigits(value)
    const nextIin = nextDigits.slice(0, 8)
    if (automaticIin.current && automaticIin.current !== nextIin && !bankLocked) {
      automaticIin.current = ''
      lookupSequence.current += 1
      setIssuerHint('')
      setDraft((prev) => ({
        ...prev,
        bankKey: 'unknown',
        bankName: '',
        secret: { ...prev.secret, fullNumber: value },
      }))
      return
    }
    setSecret('fullNumber', value)
  }

  const canSave = digits.length >= 6 && draft.nickname.trim().length > 0

  const submit = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      await onSubmit({
        ...draft,
        bankName: draft.bankName.trim() || bankTheme(draft.bankKey).short,
        // 卡号统一按分组格式存，读出来直接可显示
        secret: {
          ...draft.secret,
          fullNumber: formatCardNumber(digits, detection.network),
        },
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const luhnHint =
    detection.luhnValid === null
      ? ''
      : detection.luhnValid
        ? '校验通过'
        : '校验位不匹配，请核对卡号（证件卡可忽略）'

  return (
    <Sheet
      open={open}
      title={editing ? '编辑卡片' : '添加卡片'}
      onClose={onClose}
      trailing={
        <button className="sheet__action" onClick={() => void submit()} disabled={!canSave || saving}>
          {saving ? '保存中' : '保存'}
        </button>
      }
    >
      <div className="form__preview">
        <CardFace
          bankKey={draft.bankKey}
          bankName={draft.bankName || bankTheme(draft.bankKey).short}
          nickname={draft.nickname}
          network={detection.network}
          cardType={draft.cardType}
          fullNumber={draft.secret.fullNumber}
          last4={detection.last4}
          holder={draft.secret.holder}
          expiry={draft.secret.expiry}
          revealed
          colorOverride={draft.colorOverride}
        />
      </div>

      <label className="field">
        <span className="field__label">卡号</span>
        <input
          className="field__control field__control--mono"
          inputMode="numeric"
          autoComplete="off"
          placeholder="6225 8801 2345 6789"
          value={formatCardNumber(digits, detection.network)}
          onChange={(e) => changeCardNumber(e.target.value)}
        />
        <span
          className={`field__hint${
            detection.luhnValid === true
              ? ' field__hint--ok'
              : detection.luhnValid === false
                ? ' field__hint--warn'
                : ''
          }`}
        >
          {detection.bank !== 'unknown'
            ? `已识别：${bankTheme(detection.bank).short}${NETWORK_LABEL[detection.network] ? ' · ' + NETWORK_LABEL[detection.network] : ''}${luhnHint ? ' · ' + luhnHint : ''}`
            : issuerLoading
              ? `已识别 ${NETWORK_LABEL[detection.network] || '卡组织未知'} · 正在联网识别发卡行…`
              : draft.bankName
                ? `已识别：${NETWORK_LABEL[detection.network] || '卡组织未知'} · ${draft.bankName}${luhnHint ? ' · ' + luhnHint : ''}`
                : issuerHint ||
                  (NETWORK_LABEL[detection.network]
                    ? `已识别卡组织：${NETWORK_LABEL[detection.network]}${luhnHint ? ' · ' + luhnHint : ''}`
                    : luhnHint || '输入卡号后自动识别卡组织与发卡行')}
        </span>
      </label>

      <label className="field">
        <span className="field__label">卡片名称</span>
        <input
          className="field__control"
          placeholder="例如：日常消费卡"
          value={draft.nickname}
          onChange={(e) => set('nickname', e.target.value)}
        />
      </label>

      <div className="field__row">
        <label className="field">
          <span className="field__label">发卡行</span>
          <select
            className="field__control"
            value={draft.bankKey}
            onChange={(e) => {
              setBankLocked(true)
              lookupSequence.current += 1
              setIssuerLoading(false)
              setIssuerHint('')
              const theme = bankTheme(e.target.value)
              setDraft((prev) => ({
                ...prev,
                bankKey: theme.key,
                bankName: theme.key === 'unknown' ? '' : theme.short,
              }))
            }}
          >
            {BANK_OPTIONS.map((b) => (
              <option key={b.key} value={b.key}>
                {b.short}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">卡片类型</span>
          <select
            className="field__control"
            value={draft.cardType}
            onChange={(e) => set('cardType', e.target.value as CardType)}
          >
            {(Object.keys(CARD_TYPE_LABEL) as CardType[]).map((t) => (
              <option key={t} value={t}>
                {CARD_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {draft.bankKey === 'unknown' && (
        <label className="field">
          <span className="field__label">发卡行名称</span>
          <input
            className="field__control"
            placeholder="例如：Chase、HSBC UK"
            value={draft.bankName === '未识别' ? '' : draft.bankName}
            onChange={(e) => {
              setBankLocked(true)
              lookupSequence.current += 1
              setIssuerLoading(false)
              setIssuerHint('')
              set('bankName', e.target.value)
            }}
          />
          {issuerHint && <span className="field__hint">{issuerHint}</span>}
        </label>
      )}

      <div className="field__row">
        <label className="field">
          <span className="field__label">持卡人</span>
          <input
            className="field__control"
            placeholder="选填"
            value={draft.secret.holder}
            onChange={(e) => setSecret('holder', e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">有效期</span>
          <input
            className="field__control field__control--mono"
            placeholder="MM/YY"
            inputMode="numeric"
            maxLength={5}
            value={draft.secret.expiry}
            onChange={(e) => {
              // 只保留数字并重排为 MM/YY，避免手输斜杠或粘贴时出现重复分隔符
              const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4)
              const isDeleting = e.target.value.length < draft.secret.expiry.length
              const formatted =
                digitsOnly.length >= 2 && !(isDeleting && digitsOnly.length === 2)
                  ? digitsOnly.slice(0, 2) + '/' + digitsOnly.slice(2)
                  : digitsOnly
              setSecret('expiry', formatted)
            }}
          />
        </label>
      </div>

      <label className="field">
        <span className="field__label">预留手机号</span>
        <input
          className="field__control field__control--mono"
          inputMode="tel"
          placeholder="选填"
          value={draft.secret.phone}
          onChange={(e) => setSecret('phone', e.target.value)}
        />
      </label>

      <div className="field">
        <span className="field__label">标签</span>
        <div className="tag-editor">
          {draft.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
              <button
                className="tag-chip__x"
                aria-label={`移除标签 ${tag}`}
                onClick={() => set('tags', draft.tags.filter((t) => t !== tag))}
              >
                ×
              </button>
            </span>
          ))}
          <input
            className="tag-editor__input"
            placeholder={draft.tags.length ? '' : '回车添加'}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag(tagInput)
              } else if (e.key === 'Backspace' && !tagInput && draft.tags.length) {
                set('tags', draft.tags.slice(0, -1))
              }
            }}
            onBlur={() => addTag(tagInput)}
          />
        </div>
        {knownTags.filter((t) => !draft.tags.includes(t)).length > 0 && (
          <div className="tag-suggest">
            {knownTags
              .filter((t) => !draft.tags.includes(t))
              .slice(0, 8)
              .map((tag) => (
                <button key={tag} className="tag-suggest__item" onClick={() => addTag(tag)}>
                  + {tag}
                </button>
              ))}
          </div>
        )}
      </div>

      <div className="field">
        <span className="field__label">卡面配色</span>
        <div className="swatches">
          <button
            className={`swatch swatch--auto${!draft.colorOverride ? ' swatch--active' : ''}`}
            onClick={() => set('colorOverride', undefined)}
            aria-label="使用银行品牌色"
          >
            自动
          </button>
          {SWATCHES.map((color) => (
            <button
              key={color}
              className={`swatch${draft.colorOverride === color ? ' swatch--active' : ''}`}
              style={{ background: color }}
              onClick={() => {
                tapLight()
                set('colorOverride', color)
              }}
              aria-label={`使用颜色 ${color}`}
            />
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field__label">备注</span>
        <textarea
          className="field__control"
          placeholder="选填，例如用途、开户行网点"
          value={draft.secret.note}
          onChange={(e) => setSecret('note', e.target.value)}
        />
      </label>

      <p className="form__note">
        卡号、持卡人、手机号与备注都会用你的 PIN 加密后存在本机，不上传任何服务器。
        本应用有意不提供 CVV / 密码字段 —— 卡号与 CVV 一旦同时留存，等于凑齐了可直接盗刷的组合。
      </p>
    </Sheet>
  )
}
