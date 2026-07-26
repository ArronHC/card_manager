import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { REDUCED, SPRING } from '../../ui/motion'

interface ToastState {
  id: number
  text: string
}

const ToastContext = createContext<(text: string) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastHost({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  const [toast, setToast] = useState<ToastState | null>(null)

  const show = useCallback((text: string) => {
    const id = Date.now()
    setToast({ id, text })
    setTimeout(() => {
      // 期间若有新 toast 顶上来，就不要把它一起清掉
      setToast((cur) => (cur?.id === id ? null : cur))
    }, 2200)
  }, [])

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            transition={reduced ? REDUCED : SPRING}
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 'calc(var(--safe-bottom) + 96px)',
              translate: '-50% 0',
              zIndex: 90,
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(28, 28, 34, 0.94)',
              border: '1px solid var(--hairline)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: 'var(--shadow-float)',
              fontSize: 14,
              maxWidth: 'calc(100vw - 48px)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  )
}
