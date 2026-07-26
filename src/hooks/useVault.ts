import { App } from '@capacitor/app'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createVault, rewrapVault, unlockVault, WrongPinError } from '../crypto/kdf'
import {
  deleteVaultMeta,
  destroyEverything,
  readVaultMeta,
  writeVaultMeta,
} from '../data/db'
import {
  beginSuspension,
  mayResume,
  PIN_GRACE_MS,
  type LifecycleClock,
  type SuspensionWindow,
} from './vaultLifecycle'

export type VaultStatus = 'loading' | 'setup' | 'locked' | 'suspended' | 'unlocked'

const DEVICE_VAULT_KEY = 'wrapped-vault-meta'

/**
 * Android 端把包裹后的保险库元数据再放进 Keystore-backed SecureStorage。
 * 浏览器调试仍使用 IndexedDB，以便开发和自动化测试。
 */
async function readProtectedMeta() {
  if (!Capacitor.isNativePlatform()) return readVaultMeta()
  const value = await SecureStorage.get(DEVICE_VAULT_KEY)
  if (value && typeof value === 'object') {
    return value as unknown as NonNullable<Awaited<ReturnType<typeof readVaultMeta>>>
  }
  return undefined
}

async function writeProtectedMeta(value: NonNullable<Awaited<ReturnType<typeof readVaultMeta>>>) {
  if (Capacitor.isNativePlatform()) {
    await SecureStorage.set(DEVICE_VAULT_KEY, value as unknown as Record<string, unknown>)
    // Android 上不在 IndexedDB 留第二份可离线枚举的包裹材料。
    await deleteVaultMeta()
  } else {
    await writeVaultMeta(value)
  }
}

async function removeProtectedMeta() {
  if (Capacitor.isNativePlatform()) {
    await SecureStorage.remove(DEVICE_VAULT_KEY).catch(() => false)
  }
}

function now(): LifecycleClock {
  return { wall: Date.now(), monotonic: performance.now() }
}

/**
 * 保险库生命周期。DEK 只以不可导出的 CryptoKey 形态存在于 ref 中，
 * 不进 React state —— 避免被 DevTools 的组件树面板顺手读出来。
 */
export function useVault() {
  const [status, setStatusState] = useState<VaultStatus>('loading')
  const statusRef = useRef<VaultStatus>('loading')
  const [busy, setBusy] = useState(false)
  const dekRef = useRef<CryptoKey | null>(null)
  const suspensionRef = useRef<SuspensionWindow | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const documentVisibleRef = useRef(
    typeof document === 'undefined' || document.visibilityState !== 'hidden',
  )
  const appActiveRef = useRef(true)
  /** 递增计数：PIN 解锁一次 +1，用来触发依赖方重新加载数据。 */
  const [session, setSession] = useState(0)

  const setStatus = useCallback((next: VaultStatus) => {
    statusRef.current = next
    setStatusState(next)
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const hardLock = useCallback(() => {
    clearTimer()
    suspensionRef.current = null
    dekRef.current = null
    if (statusRef.current !== 'setup' && statusRef.current !== 'loading') {
      setStatus('locked')
    }
  }, [clearTimer, setStatus])

  const suspend = useCallback(() => {
    if (statusRef.current !== 'unlocked' || !dekRef.current) return
    suspensionRef.current = beginSuspension(suspensionRef.current, now())
    setStatus('suspended')
    clearTimer()
    const started = suspensionRef.current
    timerRef.current = setTimeout(() => {
      if (statusRef.current === 'suspended' && suspensionRef.current === started) {
        hardLock()
      }
    }, PIN_GRACE_MS)
  }, [clearTimer, hardLock, setStatus])

  const resume = useCallback(() => {
    if (statusRef.current !== 'suspended') return
    if (mayResume(suspensionRef.current, now(), Boolean(dekRef.current))) {
      clearTimer()
      suspensionRef.current = null
      setStatus('unlocked')
    } else {
      hardLock()
    }
  }, [clearTimer, hardLock, setStatus])

  const isForeground = useCallback(
    () => documentVisibleRef.current && appActiveRef.current,
    [],
  )

  const activateDek = useCallback((dek: CryptoKey) => {
    dekRef.current = dek
    setSession((n) => n + 1)
    if (isForeground()) {
      suspensionRef.current = null
      setStatus('unlocked')
    } else {
      setStatus('unlocked')
      suspend()
    }
  }, [isForeground, setStatus, suspend])

  useEffect(() => {
    let alive = true
    void readProtectedMeta().then((meta) => {
      if (!alive) return
      setStatus(meta ? 'locked' : 'setup')
    })
    return () => {
      alive = false
    }
  }, [setStatus])

  /** 首次设置 PIN */
  const setupPin = useCallback(async (pin: string) => {
    setBusy(true)
    try {
      const { meta, dek } = await createVault(pin)
      await writeProtectedMeta(meta)
      activateDek(dek)
    } finally {
      setBusy(false)
    }
  }, [activateDek])

  /** 解锁。PIN 错误时抛 WrongPinError 由调用方展示提示。 */
  const unlock = useCallback(async (pin: string) => {
    setBusy(true)
    try {
      const meta = await readProtectedMeta()
      if (!meta) throw new Error('保险库不存在')
      activateDek(await unlockVault(pin, meta))
    } finally {
      setBusy(false)
    }
  }, [activateDek])

  const changePin = useCallback(async (oldPin: string, newPin: string) => {
    setBusy(true)
    try {
      const meta = await readProtectedMeta()
      if (!meta) throw new Error('保险库不存在')
      await writeProtectedMeta(await rewrapVault(oldPin, newPin, meta))
    } finally {
      setBusy(false)
    }
  }, [])

  /** 忘记 PIN 的唯一出路：销毁设备绑定元数据与整个数据库。 */
  const resetAll = useCallback(async () => {
    setBusy(true)
    try {
      clearTimer()
      suspensionRef.current = null
      await removeProtectedMeta()
      await destroyEverything()
      dekRef.current = null
      setStatus('setup')
    } finally {
      setBusy(false)
    }
  }, [clearTimer, setStatus])

  // 两套生命周期信号可能重复触发；只有全部恢复前台后才允许恢复保险库。
  useEffect(() => {
    const maybeResume = () => {
      if (documentVisibleRef.current && appActiveRef.current) resume()
    }
    const onVisibility = () => {
      documentVisibleRef.current = document.visibilityState !== 'hidden'
      if (documentVisibleRef.current) maybeResume()
      else suspend()
    }

    document.addEventListener('visibilitychange', onVisibility)
    const nativeListener = App.addListener('appStateChange', ({ isActive }) => {
      appActiveRef.current = isActive
      if (isActive) maybeResume()
      else suspend()
    })

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      void nativeListener.then((handle) => handle.remove()).catch(() => {})
      clearTimer()
      suspensionRef.current = null
      dekRef.current = null
    }
  }, [clearTimer, resume, suspend])

  return {
    status,
    busy,
    session,
    /** 仅在 status === 'unlocked' 时暴露 DEK。 */
    getDek: () => (statusRef.current === 'unlocked' ? dekRef.current : null),
    setupPin,
    unlock,
    lock: hardLock,
    changePin,
    resetAll,
  }
}

export { WrongPinError }
