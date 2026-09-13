import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Card } from '../data/types'
import { tapLight } from '../ui/haptics'
import { REDUCED } from '../ui/motion'
import { CardFace } from './CardFace'
import './WalletStack.css'

/** 基础卡片露出高度 */
const DEFAULT_PEEK = 62

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

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

  // 卡数较多时自动适配步长，避免页面无休止过长
  const peek = cards.length > 7 ? 54 : DEFAULT_PEEK

  // 容器高度 = 前 n-1 张各占 peek + 最后一张的完整高度 + 扇形展开余量 (48px)
  const stackHeight = (cards.length - 1) * peek + cardHeight + 48

  return (
    <div className="stack" onPointerLeave={() => setHoveredIndex(null)}>
      <div
        className="stack__inner"
        ref={innerRef}
        style={{ height: stackHeight || undefined }}
      >
        {cards.map((card, index) => {
          // 依据当前悬浮卡片，动态计算位移与扇形微角度（Fan-out & Accordion）
          let targetY = 0
          let targetScale = 1
          let targetRotateZ = index % 2 === 0 ? 0.3 : -0.3

          if (hoveredIndex !== null) {
            if (index === hoveredIndex) {
              targetY = -12
              targetScale = 1.02
              targetRotateZ = 0
            } else if (index > hoveredIndex) {
              targetY = 32 // 下方卡片整体向下散开，形成风琴式开口
              targetRotateZ = index % 2 === 0 ? 0.6 : -0.6
            } else {
              targetY = -4
            }
          }

          return (
            <motion.div
              key={card.id}
              className="stack__item"
              style={{ zIndex: index, top: index * peek }}
              layoutId={`card-${card.id}`}
              onPointerEnter={() => setHoveredIndex(index)}
              onFocus={() => setHoveredIndex(index)}
              onBlur={() => setHoveredIndex(null)}
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
              {/* 入场/按压及风琴扇形展开动画放内层，与外层的 FLIP 互不干扰 */}
              <motion.div
                className="stack__card-wrapper"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40 }}
                animate={{
                  opacity: 1,
                  y: targetY,
                  scale: targetScale,
                  rotateZ: targetRotateZ,
                }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                transition={
                  reduced
                    ? REDUCED
                    : {
                        type: 'spring',
                        stiffness: 420,
                        damping: 30,
                        mass: 0.8,
                        delay: hoveredIndex === null ? Math.min(index * 0.04, 0.3) : 0,
                      }
                }
                whileTap={reduced ? undefined : { scale: 0.97 }}
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
          )
        })}
      </div>
    </div>
  )
}
