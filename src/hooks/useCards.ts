import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  collectTags,
  createCard,
  deleteCard as removeCard,
  filterCards,
  loadCards,
  persistOrder,
  updateCard,
} from '../data/cards'
import type { Card, CardDraft } from '../data/types'

/**
 * 解锁后把全部卡片解密进内存，之后搜索/过滤都在内存里做。
 * 卡片数量在几十张量级，全量解密开销可忽略，换来的是能搜备注和卡号。
 */
export function useCards(dek: CryptoKey | null, session: number) {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])

  useEffect(() => {
    if (!dek) {
      // 上锁时清空内存中的明文
      setCards([])
      setQuery('')
      setActiveTags([])
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    void loadCards(dek)
      .then((loaded) => {
        if (alive) setCards(loaded)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [dek, session])

  const create = useCallback(
    async (draft: CardDraft) => {
      if (!dek) return
      const card = await createCard(dek, draft)
      setCards((prev) => [...prev, card])
    },
    [dek],
  )

  const update = useCallback(
    async (id: string, draft: CardDraft) => {
      if (!dek) return null
      const card = await updateCard(dek, id, draft)
      setCards((prev) => prev.map((c) => (c.id === id ? card : c)))
      return card
    },
    [dek],
  )

  const remove = useCallback(async (id: string) => {
    await removeCard(id)
    setCards((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const reorder = useCallback(async (ordered: Card[]) => {
    setCards(ordered.map((c, i) => ({ ...c, sortIndex: i })))
    await persistOrder(ordered.map((c) => c.id))
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }, [])

  const allTags = useMemo(() => collectTags(cards), [cards])
  const visible = useMemo(
    () => filterCards(cards, query, activeTags),
    [cards, query, activeTags],
  )

  // 标签被删光后要把已失效的筛选条件摘掉，否则会永远筛出 0 条
  useEffect(() => {
    setActiveTags((prev) => {
      const next = prev.filter((t) => allTags.includes(t))
      return next.length === prev.length ? prev : next
    })
  }, [allTags])

  return {
    cards,
    visible,
    allTags,
    loading,
    query,
    setQuery,
    activeTags,
    toggleTag,
    clearTags: () => setActiveTags([]),
    create,
    update,
    remove,
    reorder,
  }
}
