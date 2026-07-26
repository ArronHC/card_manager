import type { Transition } from 'motion/react'

/**
 * 统一的动效常量。交互层一律用弹簧而非缓动曲线 —— 这是 Apple 手感的关键：
 * 动画随时可被打断并从当前速度接续，而不是走完固定时长。
 */

/** 主交互：卡片展开、sheet 弹出 */
export const SPRING: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
  mass: 0.9,
}

/** 轻快：按压、小元素进出 */
export const SPRING_SNAPPY: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 36,
  mass: 0.6,
}

/** 柔和：大位移、卡片散开 */
export const SPRING_SOFT: Transition = {
  type: 'spring',
  stiffness: 240,
  damping: 30,
  mass: 1,
}

/** 3D 翻面需要更重的质感，翻太快会看不清 */
export const SPRING_FLIP: Transition = {
  type: 'spring',
  stiffness: 220,
  damping: 26,
  mass: 1.1,
}

/** reduced-motion 下的降级：极短淡入，不做位移 */
export const REDUCED: Transition = { duration: 0.12, ease: 'easeOut' }
