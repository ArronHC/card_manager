import { useState } from 'react'
import { CardDetail } from './components/CardDetail'
import { CardForm } from './components/CardForm'
import { LockScreen } from './components/LockScreen'
import { AddButton, TopBar } from './components/TopBar'
import { ToastHost, useToast } from './components/ui/Toast'
import { WalletStack } from './components/WalletStack'
import type { Card, CardDraft } from './data/types'
import { useCards } from './hooks/useCards'
import { useVault } from './hooks/useVault'
import { notifySuccess } from './ui/haptics'

function UnlockedVault({
  dek,
  session,
  onLock,
}: {
  dek: CryptoKey
  session: number
  onLock: () => void
}) {
  const cards = useCards(dek, session)
  const toast = useToast()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // 只保存 ID，不复制持卡人、完整卡号等明文对象到额外的 React state。
  const detail = cards.cards.find((card) => card.id === detailId) ?? null
  const editing = cards.cards.find((card) => card.id === editingId) ?? null

  const submitCard = async (draft: CardDraft) => {
    if (editingId) {
      await cards.update(editingId, draft)
      toast('已保存')
    } else {
      await cards.create(draft)
      toast('已添加')
    }
    notifySuccess()
    setEditingId(null)
  }

  const deleteCard = async (card: Card) => {
    await cards.remove(card.id)
    setDetailId(null)
    toast('已删除')
  }

  return (
    <>
      <TopBar
        total={cards.cards.length}
        shown={cards.visible.length}
        query={cards.query}
        onQuery={cards.setQuery}
        tags={cards.allTags}
        activeTags={cards.activeTags}
        onToggleTag={cards.toggleTag}
        onLock={onLock}
      />

      {cards.loading ? (
        <div style={{ flex: 1 }} />
      ) : (
        <WalletStack cards={cards.visible} onSelect={(card) => setDetailId(card.id)} />
      )}

      <AddButton
        onClick={() => {
          setEditingId(null)
          setFormOpen(true)
        }}
      />

      <CardDetail
        card={detail}
        onClose={() => setDetailId(null)}
        onEdit={(card) => {
          setEditingId(card.id)
          setFormOpen(true)
        }}
        onDelete={deleteCard}
      />

      <CardForm
        open={formOpen}
        editing={editing}
        knownTags={cards.allTags}
        onClose={() => {
          setFormOpen(false)
          setEditingId(null)
        }}
        onSubmit={submitCard}
      />
    </>
  )
}

function Vault() {
  const vault = useVault()

  if (vault.status === 'loading' || vault.status === 'suspended') {
    return <div className="app" />
  }

  if (vault.status !== 'unlocked') {
    return (
      <div className="app">
        <LockScreen
          mode={vault.status}
          busy={vault.busy}
          onSetup={vault.setupPin}
          onUnlock={vault.unlock}
          onReset={vault.resetAll}
        />
      </div>
    )
  }

  const dek = vault.getDek()
  if (!dek) return <div className="app" />

  return (
    <div className="app">
      {/* 上锁会卸载整个子树，释放所有已解密卡片和表单状态。 */}
      <UnlockedVault key={vault.session} dek={dek} session={vault.session} onLock={vault.lock} />
    </div>
  )
}

export default function App() {
  return (
    <ToastHost>
      <Vault />
    </ToastHost>
  )
}
