import { detectCard, normalizeDigits } from '../bin/detect'
import { seal, unseal } from '../crypto/vault'
import { db } from './db'
import {
  CURRENT_CARD_PAYLOAD_VERSION,
  EMPTY_SECRET,
  type Card,
  type CardDraft,
  type CardSecret,
  type StoredCard,
  type StoredSecret,
} from './types'

interface LegacyStoredCard extends StoredCard {
  nickname: string
  bankKey: string
  bankName: string
  network: StoredSecret['network']
  cardType: StoredSecret['cardType']
  last4: string
  bin: string
  tags: string[]
  colorOverride?: string
}

function newId(): string {
  return crypto.randomUUID()
}

function isStoredSecret(value: CardSecret | StoredSecret): value is StoredSecret {
  return 'nickname' in value && 'bankKey' in value && 'tags' in value
}

/**
 * 旧版本载荷可能带有 iin8 / artwork 等已废弃字段，读出时统一剥掉；
 * 同时用 EMPTY_SECRET 补齐后加的敏感字段（如 cvv），保证解密结果 shape 完整。
 */
function normalizeStoredSecret(payload: StoredSecret): StoredSecret {
  const {
    iin8: _iin8,
    artwork: _artwork,
    ...rest
  } = payload as StoredSecret & { iin8?: unknown; artwork?: unknown }
  return {
    ...EMPTY_SECRET,
    ...rest,
    payloadVersion: CURRENT_CARD_PAYLOAD_VERSION,
  }
}

function needsPayloadMigration(payload: StoredSecret): boolean {
  return payload.payloadVersion !== CURRENT_CARD_PAYLOAD_VERSION
}

function legacyPayload(row: LegacyStoredCard, secret: CardSecret): StoredSecret {
  return normalizeStoredSecret({
    payloadVersion: CURRENT_CARD_PAYLOAD_VERSION,
    nickname: row.nickname,
    bankKey: row.bankKey,
    bankName: row.bankName,
    network: row.network,
    cardType: row.cardType,
    last4: row.last4,
    bin: row.bin,
    tags: row.tags,
    colorOverride: row.colorOverride,
    ...EMPTY_SECRET,
    ...secret,
  })
}

function toCard(row: StoredCard, payload: StoredSecret): Card {
  const {
    fullNumber,
    holder,
    expiry,
    cvv,
    phone,
    note,
    ...metadata
  } = payload
  return {
    id: row.id,
    sortIndex: row.sortIndex,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...metadata,
    secret: { fullNumber, holder, expiry, cvv, phone, note },
  }
}

/** 密文 → 明文。旧版明文元数据会在首次成功解锁后迁进密文。 */
async function decryptCard(dek: CryptoKey, row: StoredCard): Promise<Card> {
  try {
    let decoded: CardSecret | StoredSecret
    let usedLegacyEnvelope = false
    try {
      decoded = await unseal<CardSecret | StoredSecret>(dek, row.secret, row.id)
    } catch {
      decoded = await unseal<CardSecret | StoredSecret>(dek, row.secret)
      usedLegacyEnvelope = true
    }

    let payload: StoredSecret
    let needsMigration: boolean
    if (isStoredSecret(decoded)) {
      needsMigration = needsPayloadMigration(decoded)
      payload = normalizeStoredSecret(decoded)
    } else {
      needsMigration = true
      payload = legacyPayload(row as LegacyStoredCard, decoded)
    }

    if (usedLegacyEnvelope || needsMigration) {
      const migrated: StoredCard = {
        id: row.id,
        sortIndex: row.sortIndex,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        secret: await seal(dek, payload, row.id),
      }
      await db.cards.put(migrated)
    }

    return toCard(row, payload)
  } catch {
    // 不返回旧版明文元数据；解密失败的记录在 UI 中只显示中性占位。
    return {
      id: row.id,
      nickname: '无法解密的卡片',
      bankKey: 'unknown',
      bankName: '未识别',
      network: 'unknown',
      cardType: 'other',
      payloadVersion: CURRENT_CARD_PAYLOAD_VERSION,
      last4: '',
      bin: '',
      tags: [],
      sortIndex: row.sortIndex,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      secret: { ...EMPTY_SECRET, note: '⚠️ 此卡数据解密失败' },
    }
  }
}

/** 读取全部卡片并解密。解锁后调用一次，之后在内存里搜索。 */
export async function loadCards(dek: CryptoKey): Promise<Card[]> {
  const rows = await db.cards.orderBy('sortIndex').toArray()
  return Promise.all(rows.map((row) => decryptCard(dek, row)))
}

function payloadFromDraft(draft: CardDraft): StoredSecret {
  const digits = normalizeDigits(draft.secret.fullNumber)
  const detection = detectCard(digits)
  return {
    payloadVersion: CURRENT_CARD_PAYLOAD_VERSION,
    nickname: draft.nickname.trim(),
    bankKey: draft.bankKey,
    bankName: draft.bankName,
    network: detection.network,
    cardType: draft.cardType,
    last4: digits.slice(-4),
    bin: detection.bin,
    tags: dedupeTags(draft.tags),
    colorOverride: draft.colorOverride,
    ...draft.secret,
  }
}

export async function createCard(
  dek: CryptoKey,
  draft: CardDraft,
  now: number = Date.now(),
): Promise<Card> {
  const maxSort = (await db.cards.orderBy('sortIndex').last())?.sortIndex ?? -1
  const id = newId()
  const payload = payloadFromDraft(draft)
  const row: StoredCard = {
    id,
    sortIndex: maxSort + 1,
    createdAt: now,
    updatedAt: now,
    secret: await seal(dek, payload, id),
  }
  await db.cards.add(row)
  return toCard(row, payload)
}

export async function updateCard(
  dek: CryptoKey,
  id: string,
  draft: CardDraft,
  now: number = Date.now(),
): Promise<Card> {
  const existing = await db.cards.get(id)
  if (!existing) throw new Error(`卡片不存在: ${id}`)
  const payload = payloadFromDraft(draft)
  const row: StoredCard = {
    id,
    sortIndex: existing.sortIndex,
    createdAt: existing.createdAt,
    updatedAt: now,
    secret: await seal(dek, payload, id),
  }
  await db.cards.put(row)
  return toCard(row, payload)
}

export async function deleteCard(id: string): Promise<void> {
  await db.cards.delete(id)
}

/** 拖拽排序后批量落盘。 */
export async function persistOrder(ids: string[]): Promise<void> {
  await db.transaction('rw', db.cards, async () => {
    await Promise.all(
      ids.map((id, index) => db.cards.update(id, { sortIndex: index })),
    )
  })
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const tag = raw.trim()
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    out.push(tag)
  }
  return out
}

/** 全部卡片里出现过的标签，按使用频次降序。 */
export function collectTags(cards: Card[]): string[] {
  const counts = new Map<string, number>()
  for (const card of cards) {
    for (const tag of card.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
    .map(([tag]) => tag)
}

/** 解锁后的内存搜索 + 多标签交集过滤。 */
export function filterCards(
  cards: Card[],
  query: string,
  activeTags: string[],
): Card[] {
  const q = query.trim().toLowerCase()
  const qDigits = normalizeDigits(query)

  return cards.filter((card) => {
    if (activeTags.length > 0) {
      if (!activeTags.every((tag) => card.tags.includes(tag))) return false
    }
    if (!q) return true

    if (qDigits.length > 0) {
      const cardDigits = normalizeDigits(card.secret.fullNumber)
      if (cardDigits.includes(qDigits)) return true
    }

    const haystack = [
      card.nickname,
      card.bankName,
      card.last4,
      card.secret.holder,
      card.secret.phone,
      card.secret.note,
      ...card.tags,
    ]
      .join('\n')
      .toLowerCase()
    return haystack.includes(q)
  })
}
