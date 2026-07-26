export const PIN_GRACE_MS = 5 * 60 * 1000

export interface SuspensionWindow {
  wallStartedAt: number
  monotonicStartedAt: number
}

export interface LifecycleClock {
  wall: number
  monotonic: number
}

export function beginSuspension(
  current: SuspensionWindow | null,
  clock: LifecycleClock,
): SuspensionWindow {
  return current ?? {
    wallStartedAt: clock.wall,
    monotonicStartedAt: clock.monotonic,
  }
}

/** 任一时钟达到边界都视为过期，防止系统时间回拨延长认证。 */
export function mayResume(
  window: SuspensionWindow | null,
  clock: LifecycleClock,
  hasDek: boolean,
): boolean {
  if (!window || !hasDek) return false
  const wallElapsed = Math.max(0, clock.wall - window.wallStartedAt)
  const monotonicElapsed = Math.max(0, clock.monotonic - window.monotonicStartedAt)
  return wallElapsed < PIN_GRACE_MS && monotonicElapsed < PIN_GRACE_MS
}
