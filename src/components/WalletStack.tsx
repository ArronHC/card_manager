import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Card } from '../data/types'
import { tapLight } from '../ui/haptics'
import { REDUCED, SPRING_SOFT } from '../ui/motion'
import { CardFace } from './CardFace'
import './WalletStack.css'

/** 每张卡露出的高度，与 CSS 中的 --stack-peek 保持一致。 */
const PEEK = 62

export function WalletStack({
  cards,
  onSelect,
}: {
  cards: Card[]
  onSelect: (card: Card) => void
}) {
  const reduced = useReducedMotion()
  const innerRef = useRef<HTMLDivElement>(null)
  const [cardHeight, setCardHeight] = useState(0)

  // 卡片高度由宽度和固定宽高比决定；随窗口变化重新测量，
  // 因为容器高度需要按「最后一张卡完整露出」来算。
  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const measure = () => setCardHeight(el.clientWidth / 1.586)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (cards.length === 0) {
    return (
      <div className="stack">
        <div className="stack__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="2.5"
              y="6"
              width="19"
              height="13"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M2.5 10.5h19" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <div className="stack__empty-title">还没有卡片</div>
          <div className="stack__empty-text">
            点右下角的 + 添加第一张卡，卡组织会在本机识别，境外发卡行可联网查询。
          </div>
        </div>
      </div>
    )
  }

  // 容器高度 = 前 n-1 张各占 PEEK + 最后一张的完整高度
  const stackHeight = (cards.length - 1) * PEEK + cardHeight

  return (
    <div className="stack">
      <div
        className="stack__inner"
        ref={innerRef}
        style={{ height: stackHeight || undefined }}
      >
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            className="stack__item"
            // 堆叠位置用 top 布局定位而不是 y transform：
            // layoutId 的 FLIP 形变独占 transform 通道，
            // 否则详情页收起时会先执行残留的 y 弹簧再归位（先下弹一下）。
            style={{ zIndex: index, top: index * PEEK }}
            // layoutId 让卡片与详情页之间做 FLIP 连续形变
            layoutId={`card-${card.id}`}
            onClick={() => {
              tapLight()
              onSelect(card)
            }}
            role="button"
            tabIndex={0}
            aria-label={`${card.bankName} ${card.nickname} 尾号 ${card.last4}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(card)
              }
            }}
          >
            {/* 入场/按压动画放内层，与外层的 FLIP 互不干扰 */}
            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              transition={
                reduced
                  ? REDUCED
                  : // 入场按索引错落 40ms，形成 Wallet 式的逐张滑入
                    { ...SPRING_SOFT, delay: Math.min(index * 0.04, 0.4) }
              }
              whileTap={reduced ? undefined : { scale: 0.975 }}
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
                colorOverride={card.colorOverride}
              />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
