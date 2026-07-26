import { motion, useReducedMotion } from 'motion/react'
import { tapLight } from '../ui/haptics'
import { SPRING_SNAPPY } from '../ui/motion'
import './TopBar.css'

export function TopBar({
  total,
  shown,
  query,
  onQuery,
  tags,
  activeTags,
  onToggleTag,
  onLock,
}: {
  total: number
  shown: number
  query: string
  onQuery: (v: string) => void
  tags: string[]
  activeTags: string[]
  onToggleTag: (tag: string) => void
  onLock: () => void
}) {
  const filtering = query.trim() !== '' || activeTags.length > 0

  return (
    <header className="topbar">
      <div className="topbar__head">
        <h1 className="topbar__title">卡包</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="topbar__count">
            {filtering ? `${shown} / ${total} 张` : `${total} 张`}
          </span>
          <button className="topbar__lock" onClick={onLock}>
            锁定
          </button>
        </div>
      </div>

      <div className="search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="var(--text-tertiary)" strokeWidth="1.8" />
          <path
            d="m16 16 4.5 4.5"
            stroke="var(--text-tertiary)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <input
          className="search__input"
          type="search"
          placeholder="搜索名称、银行、卡号、备注"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        {query && (
          <button className="search__clear" onClick={() => onQuery('')} aria-label="清空搜索">
            ×
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="tagbar" role="group" aria-label="标签筛选">
          {tags.map((tag) => {
            const active = activeTags.includes(tag)
            return (
              <button
                key={tag}
                className={`tagbar__chip${active ? ' tagbar__chip--active' : ''}`}
                aria-pressed={active}
                onClick={() => {
                  tapLight()
                  onToggleTag(tag)
                }}
              >
                {tag}
              </button>
            )
          })}
        </div>
      )}
    </header>
  )
}

export function AddButton({ onClick }: { onClick: () => void }) {
  const reduced = useReducedMotion()
  return (
    <motion.button
      className="fab"
      onClick={() => {
        tapLight()
        onClick()
      }}
      aria-label="添加卡片"
      whileTap={reduced ? undefined : { scale: 0.9 }}
      transition={SPRING_SNAPPY}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </motion.button>
  )
}
