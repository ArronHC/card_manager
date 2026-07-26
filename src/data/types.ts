import type { CardNetwork } from '../bin/detect'
import type { Sealed } from '../crypto/vault'

export type CardType = 'debit' | 'credit' | 'id' | 'other'

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  debit: '储蓄卡',
  credit: '信用卡',
  id: '证件卡',
  other: '其他',
}

export const CURRENT_CARD_PAYLOAD_VERSION = 3

export interface StoredMetadata {
  payloadVersion: number
  nickname: string
  bankKey: string
  bankName: string
  network: CardNetwork
  cardType: CardType
  last4: string
  bin: string
  tags: string[]
  colorOverride?: string
}

/** 落库的密文载荷。除排序所需字段外，所有用户可见信息都在密文中。 */
export interface StoredSecret extends StoredMetadata, CardSecret {}

export interface StoredCard {
  id: string
  sortIndex: number
  createdAt: number
  updatedAt: number
  secret: Sealed
}

/** 解密后的敏感字段。只在内存中存在。 */
export interface CardSecret {
  fullNumber: string
  holder: string
  expiry: string
  phone: string
  note: string
}

export const EMPTY_SECRET: CardSecret = {
  fullNumber: '',
  holder: '',
  expiry: '',
  phone: '',
  note: '',
}

/** 解锁后 UI 使用的完整卡片模型。 */
export interface Card extends StoredMetadata {
  id: string
  sortIndex: number
  createdAt: number
  updatedAt: number
  secret: CardSecret
}

/** 新增/编辑表单的数据形态。 */
export type CardDraft = Omit<
  Card,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'sortIndex'
  | 'last4'
  | 'bin'
  | 'network'
  | 'payloadVersion'
> & {
  id?: string
}
