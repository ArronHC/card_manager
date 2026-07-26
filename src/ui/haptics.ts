import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/**
 * 触感反馈。浏览器里降级到 Vibration API（桌面 Chrome 无声无感，不报错）。
 * 所有调用都吞掉异常 —— 触感失败绝不该影响主流程。
 */

const isNative = Capacitor.isNativePlatform()

function webVibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* 忽略 */
    }
  }
}

export function tapLight(): void {
  if (isNative) {
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
  } else {
    webVibrate(8)
  }
}

export function tapMedium(): void {
  if (isNative) {
    void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
  } else {
    webVibrate(14)
  }
}

export function notifySuccess(): void {
  if (isNative) {
    void Haptics.notification({ type: NotificationType.Success }).catch(() => {})
  } else {
    webVibrate([10, 40, 10])
  }
}

export function notifyError(): void {
  if (isNative) {
    void Haptics.notification({ type: NotificationType.Error }).catch(() => {})
  } else {
    webVibrate([30, 60, 30])
  }
}
