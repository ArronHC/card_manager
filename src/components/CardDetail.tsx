import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { formatCardNumber, NETWORK_LABEL, normalizeDigits } from '../bin/detect'
import { CARD_TYPE_LABEL, type Card } from '../data/types'
import { notifySuccess, tapLight, tapMedium } from '../ui/haptics'
import { REDUCED, SPRING, SPRING_FLIP } from '../ui/motion'
import { CardFace } from './CardFace'
import { useToast } from './ui/Toast'
import './CardDetail.css'

/** 复制到剪贴板后多久自动清空 —— 防止卡号长期留在系统剪贴板里。 */
const CLIPBOARD_CLEAR_MS = 30_000

export function CardDetail({
  card,
  onClose,
  onEdit,
  onDelete,
}: {
  card: Card | null
  onClose: () => void
  onEdit: (card: Card) => void
  onDelete: (card: Card) => Promise<void>
}) {
  const reduced = useReducedMotion()
  const toast = useToast()
  const [revealed, setRevealed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copiedNumber = useRef<string | null>(null)

  // 换卡或关闭时一律回到遮码状态，不让上一张的明文残留
  useEffect(() => {
    setRevealed(false)
    setConfirmDelete(false)
  }, [card?.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (card) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, onClose])

  const clearOwnedClipboard = async () => {
    const owned = copiedNumber.current
    if (!owned) return
    copiedNumber.current = null
    if (clearTimer.current) {
      clearTimeout(clearTimer.current)
      clearTimer.current = null
    }
    try {
      const cur = await navigator.clipboard.readText()
      if (cur === owned) await navigator.clipboard.writeText('')
    } catch {
      // 无法读取时不盲目清空，避免擦掉用户之后复制的其他内容。
    }
  }

  // 关闭详情、上锁（组件卸载）或进入后台时，立即清理本应用拥有的卡号。
  useEffect(() => {
    if (!card) void clearOwnedClipboard()
  }, [card])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void clearOwnedClipboard()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      void clearOwnedClipboard()
    }
  }, [])

  const copyNumber = async () => {
    if (!card) return
    const digits = normalizeDigits(card.secret.fullNumber)
    try {
      await navigator.clipboard.writeText(digits)
      copiedNumber.current = digits
      notifySuccess()
      toast(`已复制卡号，${CLIPBOARD_CLEAR_MS / 1000} 秒后自动清空`)
      if (clearTimer.current) clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(() => {
        void clearOwnedClipboard()
      }, CLIPBOARD_CLEAR_MS)
    } catch {
      toast('复制失败，请手动选择卡号')
    }
  }

  return (
    <AnimatePresence>
      {card && (
        <>
          <motion.div
            className="detail__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={onClose}
          />
          <motion.div
            className="detail"
            initial={reduced ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? REDUCED : { duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${card.bankName} ${card.nickname}`}
          >
            <div className="detail__bar">
              <button className="detail__bar-btn" onClick={onClose}>
                完成
              </button>
              <button className="detail__bar-btn" onClick={() => onEdit(card)}>
                编辑
              </button>
            </div>

            {/* layoutId 与 WalletStack 中的卡片一致，形成连续形变而非淡入 */}
            <motion.div className="detail__card" layoutId={`card-${card.id}`}>
              <div
                style={{
                  perspective: 1400,
                  transformStyle: 'preserve-3d',
                }}
              >
                <motion.div
                  animate={{ rotateY: revealed ? 180 : 0 }}
                  transition={reduced ? REDUCED : SPRING_FLIP}
                  style={{ transformStyle: 'preserve-3d', position: 'relative' }}
                >
                  <div style={{ backfaceVisibility: 'hidden' }}>
                    <CardFace
                      bankKey={card.bankKey}
                      bankName={card.bankName}
                      nickname={card.nickname}
                      network={card.network}
                      cardType={card.cardType}
                      fullNumber={card.secret.fullNumber}
                      last4={card.last4}
                      holder={card.secret.holder}
                      expiry={card.secret.expiry}
                      colorOverride={card.colorOverride}
                    />
                  </div>
                  {/* 背面：只有翻过来时才渲染完整卡号 */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      transform: 'rotateY(180deg)',
                      backfaceVisibility: 'hidden',
                    }}
                    aria-hidden={!revealed}
                  >
                    <CardFace
                      bankKey={card.bankKey}
                      bankName={card.bankName}
                      nickname={card.nickname}
                      network={card.network}
                      cardType={card.cardType}
                      fullNumber={card.secret.fullNumber}
                      last4={card.last4}
                      holder={card.secret.holder}
                      expiry={card.secret.expiry}
                      revealed
                      colorOverride={card.colorOverride}
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>

            <div className="detail__actions">
              <motion.button
                className={`action-btn${revealed ? ' action-btn--active' : ''}`}
                onClick={() => {
                  tapMedium()
                  setRevealed((v) => !v)
                }}
                whileTap={reduced ? undefined : { scale: 0.96 }}
                transition={SPRING}
              >
                <EyeIcon open={revealed} />
                {revealed ? '隐藏卡号' : '显示卡号'}
              </motion.button>
              <motion.button
                className="action-btn"
                onClick={() => void copyNumber()}
                whileTap={reduced ? undefined : { scale: 0.96 }}
                transition={SPRING}
              >
                <CopyIcon />
                复制卡号
              </motion.button>
              <motion.button
                className="action-btn"
                onClick={() => {
                  tapLight()
                  onEdit(card)
                }}
                whileTap={reduced ? undefined : { scale: 0.96 }}
                transition={SPRING}
              >
                <PencilIcon />
                编辑
              </motion.button>
            </div>

            <div className="detail__rows">
              <Row label="卡号">
                <span
                  className={`detail__row-value detail__row-value--mono${revealed ? ' selectable' : ''}`}
                >
                  {revealed
                    ? formatCardNumber(
                        normalizeDigits(card.secret.fullNumber),
                        card.network,
                      )
                    : `•••• ${card.last4}`}
                </span>
              </Row>
              <Row label="发卡行">{card.bankName}</Row>
              <Row label="卡片类型">{CARD_TYPE_LABEL[card.cardType]}</Row>
              {NETWORK_LABEL[card.network] && (
                <Row label="卡组织">{NETWORK_LABEL[card.network]}</Row>
              )}
              {card.secret.holder && <Row label="持卡人">{card.secret.holder}</Row>}
              {card.secret.expiry && (
                <Row label="有效期">
                  <span className="detail__row-value detail__row-value--mono">
                    {card.secret.expiry}
                  </span>
                </Row>
              )}
              {card.secret.phone && (
                <Row label="预留手机">
                  <span className="detail__row-value detail__row-value--mono">
                    {revealed
                      ? card.secret.phone
                      : card.secret.phone.replace(/^(\d{3})\d+(\d{4})$/, '$1****$2')}
                  </span>
                </Row>
              )}
              {card.tags.length > 0 && (
                <Row label="标签">
                  <div className="detail__tags">
                    {card.tags.map((tag) => (
                      <span key={tag} className="detail__tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </Row>
              )}
              {card.secret.note && <Row label="备注">{card.secret.note}</Row>}
            </div>

            <div className="detail__danger-zone">
              {confirmDelete ? (
                <>
                  <p className="detail__delete-hint">
                    删除后无法恢复，确定要删除「{card.nickname}」吗？
                  </p>
                  <button
                    className="detail__delete"
                    onClick={() => {
                      void onDelete(card)
                    }}
                  >
                    确认删除
                  </button>
                  <button
                    className="detail__bar-btn"
                    style={{ marginTop: 8 }}
                    onClick={() => setConfirmDelete(false)}
                  >
                    取消
                  </button>
                </>
              ) : (
                <button
                  className="detail__delete"
                  onClick={() => {
                    tapLight()
                    setConfirmDelete(true)
                  }}
                >
                  删除这张卡
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="detail__row">
      <span className="detail__row-label">{label}</span>
      {typeof children === 'string' ? (
        <span className="detail__row-value">{children}</span>
      ) : (
        children
      )}
    </div>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      {!open && <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M15.5 5.5A2 2 0 0 0 13.5 3.5h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4L20 8a2.5 2.5 0 0 0-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
