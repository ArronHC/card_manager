import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { REDUCED, SPRING } from '../../ui/motion'
import './Sheet.css'

/**
 * 底部弹层。支持向下拖拽关闭：拖出 120px 或甩出足够速度即关闭，
 * 否则弹回原位（弹簧接管，不做时长固定的回弹）。
 */
export function Sheet({
  open,
  title,
  onClose,
  leading,
  trailing,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  leading?: ReactNode
  trailing?: ReactNode
  children: ReactNode
}) {
  const reduced = useReducedMotion()

  // 打开时按 Esc 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="sheet__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduced ? { opacity: 0 } : { y: '100%' }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: '100%' }}
            transition={reduced ? REDUCED : SPRING}
            drag={reduced ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 800) onClose()
            }}
          >
            <div className="sheet__grabber" aria-hidden="true" />
            <div className="sheet__head">
              <div style={{ minWidth: 64, textAlign: 'left' }}>
                {leading ?? (
                  <button className="sheet__action sheet__action--muted" onClick={onClose}>
                    取消
                  </button>
                )}
              </div>
              <h2 className="sheet__title">{title}</h2>
              <div style={{ minWidth: 64, textAlign: 'right' }}>{trailing}</div>
            </div>
            {/* 内容区禁用拖拽，否则滚动会被 sheet 的 drag 抢走 */}
            <div className="sheet__body" onPointerDownCapture={(e) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
