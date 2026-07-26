import type { Glyph } from '../bin/banks'

/**
 * 卡面上的银行标识。全部是自绘几何图形，不使用真实银行 logo —— 既规避商标问题，
 * 也省掉为几十家银行内置位图。每种 glyph 只是一组抽象线条，靠品牌渐变色区分。
 */
export function BankGlyph({
  glyph,
  size = 34,
  color,
  opacity = 0.9,
}: {
  glyph: Glyph
  size?: number
  color: string
  opacity?: number
}) {
  const stroke = { stroke: color, strokeWidth: 1.6, fill: 'none' as const }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      style={{ opacity, flex: 'none' }}
    >
      {glyph === 'concentric' && (
        <>
          <circle cx="16" cy="16" r="13" {...stroke} />
          <circle cx="16" cy="16" r="8" {...stroke} />
          <circle cx="16" cy="16" r="3" fill={color} stroke="none" />
        </>
      )}
      {glyph === 'chevron' && (
        <>
          <path d="M5 21 L16 9 L27 21" {...stroke} strokeLinecap="round" />
          <path d="M5 27 L16 15 L27 27" {...stroke} strokeLinecap="round" opacity="0.5" />
        </>
      )}
      {glyph === 'diamond' && (
        <>
          <path d="M16 3 L29 16 L16 29 L3 16 Z" {...stroke} />
          <path d="M16 10 L22 16 L16 22 L10 16 Z" fill={color} stroke="none" opacity="0.85" />
        </>
      )}
      {glyph === 'arc' && (
        <>
          <path d="M4 24 A 14 14 0 0 1 28 24" {...stroke} strokeLinecap="round" />
          <path d="M9 24 A 9 9 0 0 1 23 24" {...stroke} strokeLinecap="round" opacity="0.6" />
          <circle cx="16" cy="24" r="2.4" fill={color} stroke="none" />
        </>
      )}
      {glyph === 'grid' && (
        <>
          <rect x="4" y="4" width="10" height="10" rx="2" {...stroke} />
          <rect x="18" y="4" width="10" height="10" rx="2" fill={color} stroke="none" opacity="0.8" />
          <rect x="4" y="18" width="10" height="10" rx="2" fill={color} stroke="none" opacity="0.8" />
          <rect x="18" y="18" width="10" height="10" rx="2" {...stroke} />
        </>
      )}
      {glyph === 'wave' && (
        <>
          <path d="M3 12 Q 9.5 5 16 12 T 29 12" {...stroke} strokeLinecap="round" />
          <path d="M3 19 Q 9.5 12 16 19 T 29 19" {...stroke} strokeLinecap="round" opacity="0.7" />
          <path d="M3 26 Q 9.5 19 16 26 T 29 26" {...stroke} strokeLinecap="round" opacity="0.4" />
        </>
      )}
      {glyph === 'bars' && (
        <>
          <rect x="5" y="14" width="4.5" height="14" rx="2" fill={color} stroke="none" opacity="0.55" />
          <rect x="13.75" y="8" width="4.5" height="20" rx="2" fill={color} stroke="none" opacity="0.8" />
          <rect x="22.5" y="3" width="4.5" height="25" rx="2" fill={color} stroke="none" />
        </>
      )}
      {glyph === 'orbit' && (
        <>
          <ellipse cx="16" cy="16" rx="13" ry="6" {...stroke} />
          <ellipse cx="16" cy="16" rx="6" ry="13" {...stroke} opacity="0.6" />
          <circle cx="16" cy="16" r="3.2" fill={color} stroke="none" />
        </>
      )}
      {glyph === 'hex' && (
        <>
          <path d="M16 3 L27 9.5 L27 22.5 L16 29 L5 22.5 L5 9.5 Z" {...stroke} />
          <path d="M16 10 L22 13.5 L22 19.5 L16 23 L10 19.5 L10 13.5 Z" fill={color} stroke="none" opacity="0.8" />
        </>
      )}
      {glyph === 'blade' && (
        <>
          <path d="M6 26 L20 4 L26 4 L12 26 Z" fill={color} stroke="none" opacity="0.9" />
          <path d="M16 26 L26 12 L26 26 Z" fill={color} stroke="none" opacity="0.45" />
        </>
      )}
    </svg>
  )
}
