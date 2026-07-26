import { describe, expect, it } from 'vitest'
import {
  beginSuspension,
  mayResume,
  PIN_GRACE_MS,
  type LifecycleClock,
} from './vaultLifecycle'

const at = (wall: number, monotonic = wall): LifecycleClock => ({ wall, monotonic })

describe('PIN 后台宽限', () => {
  it('首次后台记录起点，重复事件不续期', () => {
    const first = beginSuspension(null, at(1_000))
    const duplicate = beginSuspension(first, at(60_000))
    expect(duplicate).toBe(first)
    expect(duplicate.wallStartedAt).toBe(1_000)
  })

  it('五分钟边界前可恢复，边界时立即过期', () => {
    const window = beginSuspension(null, at(10_000))
    expect(mayResume(window, at(10_000 + PIN_GRACE_MS - 1), true)).toBe(true)
    expect(mayResume(window, at(10_000 + PIN_GRACE_MS), true)).toBe(false)
  })

  it('没有 DEK 时即使未到期也不能恢复', () => {
    const window = beginSuspension(null, at(0))
    expect(mayResume(window, at(1_000), false)).toBe(false)
  })

  it('任一时钟达到五分钟都视为过期', () => {
    const window = beginSuspension(null, at(1_000, 5_000))
    expect(mayResume(window, at(1_001, 5_000 + PIN_GRACE_MS), true)).toBe(false)
    expect(mayResume(window, at(1_000 + PIN_GRACE_MS, 5_001), true)).toBe(false)
  })

  it('恢复后再次进入后台可以建立新的宽限窗口', () => {
    const first = beginSuspension(null, at(0))
    expect(mayResume(first, at(1_000), true)).toBe(true)
    const second = beginSuspension(null, at(20_000))
    expect(second.wallStartedAt).toBe(20_000)
  })
})
