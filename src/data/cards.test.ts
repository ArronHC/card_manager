import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createVault } from '../crypto/kdf'
import { seal } from '../crypto/vault'
import {
  collectTags,
  createCard,
  deleteCard,
  filterCards,
  loadCards,
  persistOrder,
  updateCard,
} from './cards'
import { db } from './db'
import { EMPTY_SECRET, type CardDraft } from './types'

const SLOW = { timeout: 30_000 }

let dek: CryptoKey

function draft(over: Partial<CardDraft> = {}): CardDraft {
  return {
    nickname: '招行日常卡',
    bankKey: 'cmb',
    bankName: '招商银行',
    cardType: 'debit',
    tags: ['日常'],
    ...over,
    secret: {
      ...EMPTY_SECRET,
      fullNumber: '6225 8801 2345 6789',
      holder: '张三',
      ...over.secret,
    },
  }
}

beforeEach(async () => {
  await db.cards.clear()
  await db.meta.clear()
  if (!dek) dek = (await createVault('123456')).dek
})

describe('卡片 CRUD', () => {
  it('创建后能解密读回', SLOW, async () => {
    await createCard(dek, draft())
    const cards = await loadCards(dek)
    expect(cards).toHaveLength(1)
    expect(cards[0].secret.fullNumber).toBe('6225 8801 2345 6789')
    expect(cards[0].secret.holder).toBe('张三')
    expect(cards[0].payloadVersion).toBe(3)
  })

  it('旧密文载荷首次解锁时升级版本并重新密封', SLOW, async () => {
    const id = crypto.randomUUID()
    const oldPayload = {
      nickname: '旧卡',
      bankKey: 'cmb',
      bankName: '招商银行',
      network: 'unionpay' as const,
      cardType: 'debit' as const,
      last4: '6789',
      bin: '622588',
      tags: ['旧数据'],
      ...EMPTY_SECRET,
      fullNumber: '6225 8801 2345 6789',
    }
    await db.cards.add({
      id,
      sortIndex: 0,
      createdAt: 1,
      updatedAt: 1,
      secret: await seal(dek, oldPayload, id),
    })
    const before = (await db.cards.get(id))!.secret.ct

    const [card] = await loadCards(dek)
    expect(card.payloadVersion).toBe(3)
    expect((await db.cards.get(id))!.secret.ct).not.toBe(before)
  })

  it('从卡号派生 last4 / bin / 卡组织', SLOW, async () => {
    const card = await createCard(dek, draft())
    expect(card.last4).toBe('6789')
    expect(card.bin).toBe('622588')
    expect(card.network).toBe('unionpay')
  })

  it('CVV 加密保存并可读回，遗留数据补空串', SLOW, async () => {
    await createCard(
      dek,
      draft({ secret: { ...EMPTY_SECRET, fullNumber: '6225 8801 2345 6783', cvv: '123' } }),
    )
    const [card] = await loadCards(dek)
    expect(card.secret.cvv).toBe('123')
    // 密文是 base64，短数字可能随机出现；用字段名验证载荷没有以明文落库
    expect(JSON.stringify(await db.cards.toArray())).not.toContain('cvv')

    // 老数据没有 cvv 字段，解密后应补成空串而不是 undefined
    await db.cards.clear()
    const id = crypto.randomUUID()
    const legacy = {
      payloadVersion: 3,
      nickname: '旧卡',
      bankKey: 'cmb',
      bankName: '招商银行',
      network: 'unionpay' as const,
      cardType: 'debit' as const,
      last4: '6789',
      bin: '622588',
      tags: [],
      fullNumber: '6225 8801 2345 6789',
      holder: '',
      expiry: '',
      phone: '',
      note: '',
    }
    await db.cards.add({
      id,
      sortIndex: 0,
      createdAt: 1,
      updatedAt: 1,
      secret: await seal(dek, legacy, id),
    })
    const [migrated] = await loadCards(dek)
    expect(migrated.secret.cvv).toBe('')
  })

  it('落库的行不含任何用户可见明文', SLOW, async () => {
    await createCard(dek, draft())
    const raw = await db.cards.toArray()
    const serialized = JSON.stringify(raw)
    expect(serialized).not.toContain('6225880123456789')
    expect(serialized).not.toContain('62258801')
    expect(serialized).not.toContain('6225 8801 2345 6789')
    expect(serialized).not.toContain('张三')
    expect(serialized).not.toContain('招行日常卡')
    expect(serialized).not.toContain('招商银行')
    expect(serialized).not.toContain('日常')
    expect(raw[0]).not.toHaveProperty('last4')
    expect(raw[0]).not.toHaveProperty('bankKey')
  })

  it('境外 VISA 发卡行名称与卡组织加密保存并可读回', SLOW, async () => {
    await createCard(
      dek,
      draft({
        nickname: '境外消费卡',
        bankKey: 'unknown',
        bankName: 'Jyske Bank A/S',
        cardType: 'debit',
        secret: {
          ...EMPTY_SECRET,
          fullNumber: '4571 7360 1234 5678',
          holder: 'Test Holder',
        },
      }),
    )

    const [card] = await loadCards(dek)
    expect(card.bankName).toBe('Jyske Bank A/S')
    expect(card.network).toBe('visa')
    expect(card.bin).toBe('457173')

    const serialized = JSON.stringify(await db.cards.toArray())
    expect(serialized).not.toContain('Jyske Bank')
    expect(serialized).not.toContain('45717360')
    expect(serialized).not.toContain('Test Holder')
  })

  it.each([
    ['5555555555554444', 'mastercard'],
    ['2221000000000009', 'mastercard'],
  ] as const)('境外 Mastercard %s 保存后仍识别为 %s', SLOW, async (number, network) => {
    const card = await createCard(
      dek,
      draft({
        bankKey: 'unknown',
        bankName: 'Example Foreign Bank',
        cardType: 'credit',
        secret: { ...EMPTY_SECRET, fullNumber: number },
      }),
    )
    expect(card.network).toBe(network)
    expect((await loadCards(dek))[0].network).toBe(network)
  })

  it('更新会重新派生元信息并换新密文', SLOW, async () => {
    const created = await createCard(dek, draft())
    const before = (await db.cards.get(created.id))!.secret.ct

    const updated = await updateCard(
      dek,
      created.id,
      draft({
        nickname: '建行工资卡',
        bankKey: 'ccb',
        bankName: '建设银行',
        secret: { ...EMPTY_SECRET, fullNumber: '6217000123456789' },
      }),
    )
    expect(updated.bankKey).toBe('ccb')
    expect(updated.last4).toBe('6789')
    expect(updated.bin).toBe('621700')

    const after = (await db.cards.get(created.id))!.secret.ct
    expect(after).not.toBe(before)

    const reloaded = await loadCards(dek)
    expect(reloaded[0].secret.fullNumber).toBe('6217000123456789')
  })

  it('更新不存在的卡片时报错', SLOW, async () => {
    await expect(updateCard(dek, 'nope', draft())).rejects.toThrow('卡片不存在')
  })

  it('删除后读不到', SLOW, async () => {
    const card = await createCard(dek, draft())
    await deleteCard(card.id)
    expect(await loadCards(dek)).toHaveLength(0)
  })

  it('新卡追加到末尾，排序可持久化', SLOW, async () => {
    const a = await createCard(dek, draft({ nickname: 'A' }))
    const b = await createCard(dek, draft({ nickname: 'B' }))
    const c = await createCard(dek, draft({ nickname: 'C' }))
    expect((await loadCards(dek)).map((x) => x.nickname)).toEqual(['A', 'B', 'C'])

    await persistOrder([c.id, a.id, b.id])
    expect((await loadCards(dek)).map((x) => x.nickname)).toEqual(['C', 'A', 'B'])
  })

  it('标签去重且剔除空白项', SLOW, async () => {
    const card = await createCard(
      dek,
      draft({ tags: ['日常', ' 日常 ', '', '  ', '工资'] }),
    )
    expect(card.tags).toEqual(['日常', '工资'])
  })

  it('用别的 DEK 读取时降级而不是崩溃', SLOW, async () => {
    await createCard(dek, draft())
    const other = (await createVault('999999')).dek
    const cards = await loadCards(other)
    expect(cards).toHaveLength(1)
    expect(cards[0].secret.fullNumber).toBe('')
    expect(cards[0].secret.note).toContain('解密失败')
    expect(cards[0].nickname).toBe('无法解密的卡片')
  })
})

describe('搜索与标签过滤', () => {
  const mk = (over: Partial<CardDraft>) => ({
    id: over.nickname!,
    nickname: over.nickname!,
    bankKey: over.bankKey ?? 'cmb',
    bankName: over.bankName ?? '招商银行',
    network: 'unionpay' as const,
    cardType: 'debit' as const,
    payloadVersion: 3,
    last4: '6789',
    bin: '622588',
    tags: over.tags ?? [],
    sortIndex: 0,
    createdAt: 0,
    updatedAt: 0,
    secret: { ...EMPTY_SECRET, ...over.secret },
  })

  const cards = [
    mk({
      nickname: '招行日常卡',
      tags: ['日常', '常用'],
      secret: { ...EMPTY_SECRET, fullNumber: '6225880123456789', holder: '张三' },
    }),
    mk({
      nickname: '建行工资卡',
      bankKey: 'ccb',
      bankName: '建设银行',
      tags: ['工资'],
      secret: { ...EMPTY_SECRET, fullNumber: '6217000199998888', note: '每月 15 号' },
    }),
    mk({
      nickname: '中信信用卡',
      bankKey: 'citic',
      bankName: '中信银行',
      tags: ['常用', '信用'],
      secret: { ...EMPTY_SECRET, fullNumber: '6226800111112222' },
    }),
  ]

  it('空查询返回全部', () => {
    expect(filterCards(cards, '', [])).toHaveLength(3)
  })

  it('按昵称搜索', () => {
    expect(filterCards(cards, '工资', []).map((c) => c.nickname)).toEqual([
      '建行工资卡',
    ])
  })

  it('按银行名搜索', () => {
    expect(filterCards(cards, '中信', []).map((c) => c.nickname)).toEqual([
      '中信信用卡',
    ])
  })

  it('按备注搜索', () => {
    expect(filterCards(cards, '每月', []).map((c) => c.nickname)).toEqual([
      '建行工资卡',
    ])
  })

  it('按持卡人搜索', () => {
    expect(filterCards(cards, '张三', []).map((c) => c.nickname)).toEqual([
      '招行日常卡',
    ])
  })

  it('卡号搜索忽略空格', () => {
    expect(filterCards(cards, '6217 0001', []).map((c) => c.nickname)).toEqual([
      '建行工资卡',
    ])
  })

  it('卡号中段也能搜到', () => {
    expect(filterCards(cards, '9999', []).map((c) => c.nickname)).toEqual([
      '建行工资卡',
    ])
  })

  it('多标签取交集', () => {
    expect(filterCards(cards, '', ['常用']).map((c) => c.nickname)).toEqual([
      '招行日常卡',
      '中信信用卡',
    ])
    expect(
      filterCards(cards, '', ['常用', '信用']).map((c) => c.nickname),
    ).toEqual(['中信信用卡'])
  })

  it('标签与关键词同时生效', () => {
    expect(filterCards(cards, '招行', ['常用']).map((c) => c.nickname)).toEqual([
      '招行日常卡',
    ])
    expect(filterCards(cards, '招行', ['工资'])).toHaveLength(0)
  })

  it('无匹配返回空数组', () => {
    expect(filterCards(cards, '不存在的东西', [])).toHaveLength(0)
  })

  it('collectTags 按频次降序，同频次按拼音', () => {
    // 常用 出现 2 次排最前；其余各 1 次，按拼音 gongzi < richang < xinyong
    expect(collectTags(cards)).toEqual(['常用', '工资', '日常', '信用'])
  })
})
