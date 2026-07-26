import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { WrongPinError } from '../hooks/useVault'
import { notifyError, notifySuccess, tapLight } from '../ui/haptics'
import { REDUCED, SPRING, SPRING_SNAPPY } from '../ui/motion'
import './LockScreen.css'

const PIN_LENGTH = 6
const RESET_PHRASE = '清空全部数据'

type Mode = 'setup' | 'confirm' | 'unlock'

export function LockScreen({
  mode,
  busy,
  onSetup,
  onUnlock,
  onReset,
}: {
  mode: 'setup' | 'locked'
  busy: boolean
  onSetup: (pin: string) => Promise<void>
  onUnlock: (pin: string) => Promise<void>
  onReset: () => Promise<void>
}) {
  const reduced = useReducedMotion()
  const [stage, setStage] = useState<Mode>(mode === 'setup' ? 'setup' : 'unlock')
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetPhrase, setResetPhrase] = useState('')

  // pin 以 ref 为准，state 只用于渲染。
  // 原因有二：连续快速按键会落在同一渲染批次里，闭包里的 pin 是旧值会丢键；
  // 而在 setState 的更新函数里做副作用又会被 StrictMode 双调用触发两次提交。
  const pinRef = useRef('')
  const resetPin = useCallback(() => {
    pinRef.current = ''
    setPin('')
  }, [])

  useEffect(() => {
    setStage(mode === 'setup' ? 'setup' : 'unlock')
    resetPin()
    setFirstPin('')
    setError('')
  }, [mode, resetPin])

  const fail = useCallback(
    (message: string) => {
      setError(message)
      resetPin()
      setShake((n) => n + 1)
      notifyError()
    },
    [resetPin],
  )

  const submit = useCallback(
    async (value: string) => {
      if (stage === 'setup') {
        setFirstPin(value)
        resetPin()
        setError('')
        setStage('confirm')
        tapLight()
        return
      }
      if (stage === 'confirm') {
        if (value !== firstPin) {
          setStage('setup')
          setFirstPin('')
          fail('两次输入不一致，请重新设置')
          return
        }
        try {
          await onSetup(value)
          notifySuccess()
        } catch {
          fail('创建保险库失败')
        }
        return
      }
      try {
        await onUnlock(value)
        notifySuccess()
      } catch (err) {
        fail(err instanceof WrongPinError ? 'PIN 不正确' : '解锁失败')
      }
    },
    [stage, firstPin, onSetup, onUnlock, fail, resetPin],
  )

  const press = useCallback(
    (digit: string) => {
      if (busy || pinRef.current.length >= PIN_LENGTH) return
      tapLight()
      setError('')
      const next = pinRef.current + digit
      pinRef.current = next
      setPin(next)
      if (next.length === PIN_LENGTH) {
        // 让最后一个圆点先填充完再提交，否则视觉上会跳过一帧
        setTimeout(() => void submit(next), 120)
      }
    },
    [busy, submit],
  )

  const backspace = useCallback(() => {
    if (busy || !pinRef.current) return
    tapLight()
    pinRef.current = pinRef.current.slice(0, -1)
    setPin(pinRef.current)
  }, [busy])

  // 物理键盘支持（浏览器调试时用得上）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') backspace()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press, backspace])

  const title =
    stage === 'setup' ? '设置 PIN' : stage === 'confirm' ? '再输一次' : '输入 PIN'
  const hint =
    stage === 'setup'
      ? `设置 ${PIN_LENGTH} 位 PIN 用于加密卡片数据。忘记后无法找回。`
      : stage === 'confirm'
        ? '确认刚才设置的 PIN'
        : '解锁后才能看到卡片内容'

  return (
    <div className="lock">
      <div className="lock__head">
        <div className="lock__mark">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="4"
              y="10"
              width="16"
              height="11"
              rx="2.5"
              stroke="#fff"
              strokeWidth="1.8"
            />
            <path
              d="M8 10V7a4 4 0 1 1 8 0v3"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="lock__title">{title}</h1>
        <p className="lock__hint">{hint}</p>

        <motion.div
          className="pin-dots"
          key={shake}
          animate={
            shake > 0 && !reduced
              ? { x: [0, -10, 9, -7, 5, 0] }
              : undefined
          }
          transition={{ duration: 0.42 }}
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <motion.span
              key={i}
              className={`pin-dot${i < pin.length ? ' pin-dot--filled' : ''}`}
              animate={{ scale: i < pin.length ? 1.12 : 1 }}
              transition={reduced ? REDUCED : SPRING_SNAPPY}
            />
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.p
            className="lock__error"
            key={error}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={REDUCED}
          >
            {busy ? '处理中…' : error}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="pin-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <motion.button
            key={d}
            className="pin-key"
            onClick={() => press(d)}
            disabled={busy}
            whileTap={reduced ? undefined : { scale: 0.92 }}
            transition={SPRING_SNAPPY}
          >
            {d}
          </motion.button>
        ))}
        <span />
        <motion.button
          className="pin-key"
          onClick={() => press('0')}
          disabled={busy}
          whileTap={reduced ? undefined : { scale: 0.92 }}
          transition={SPRING_SNAPPY}
        >
          0
        </motion.button>
        <motion.button
          className="pin-key pin-key--plain"
          onClick={backspace}
          disabled={busy || !pin}
          whileTap={reduced ? undefined : { scale: 0.92 }}
          transition={SPRING_SNAPPY}
          aria-label="删除"
        >
          删除
        </motion.button>
      </div>

      <div className="lock__foot">
        {stage === 'confirm' && (
          <button
            className="lock__link"
            onClick={() => {
              setStage('setup')
              setFirstPin('')
              resetPin()
            }}
          >
            重新设置
          </button>
        )}
        {stage === 'unlock' && (
          <AnimatePresence mode="wait" initial={false}>
            {confirmingReset ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={reduced ? REDUCED : SPRING}
                style={{ textAlign: 'center' }}
              >
                <p className="lock__hint" style={{ marginBottom: 8 }}>
                  此操作会删除设备绑定密钥和全部卡片。请输入“{RESET_PHRASE}”确认。
                </p>
                <input
                  className="lock__reset-input"
                  value={resetPhrase}
                  onChange={(event) => setResetPhrase(event.target.value)}
                  placeholder={RESET_PHRASE}
                  autoComplete="off"
                />
                <button
                  className="lock__link lock__link--danger"
                  disabled={resetPhrase !== RESET_PHRASE || busy}
                  onClick={() => void onReset()}
                >
                  确认清空全部数据
                </button>
                <button
                  className="lock__link"
                  onClick={() => {
                    setConfirmingReset(false)
                    setResetPhrase('')
                  }}
                >
                  取消
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="link"
                className="lock__link"
                onClick={() => setConfirmingReset(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={REDUCED}
              >
                忘记 PIN？
              </motion.button>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
