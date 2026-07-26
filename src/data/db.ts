import Dexie, { type EntityTable } from 'dexie'
import type { VaultMeta } from '../crypto/kdf'
import type { StoredCard } from './types'

/** meta 表用固定 key 存单条保险库元数据。 */
export interface MetaRow {
  key: 'vault'
  value: VaultMeta
}

class CardDatabase extends Dexie {
  cards!: EntityTable<StoredCard, 'id'>
  meta!: EntityTable<MetaRow, 'key'>

  constructor() {
    super('card_manager')
    this.version(2).stores({
      // 所有用户可见元数据已并入密文；明文只保留记录 ID、顺序和时间戳。
      cards: 'id, sortIndex, updatedAt',
      meta: 'key',
    })
  }
}

export const db = new CardDatabase()

export async function readVaultMeta(): Promise<VaultMeta | undefined> {
  const row = await db.meta.get('vault')
  return row?.value
}

export async function writeVaultMeta(value: VaultMeta): Promise<void> {
  await db.meta.put({ key: 'vault', value })
}

export async function deleteVaultMeta(): Promise<void> {
  await db.meta.delete('vault')
}

export async function hasVault(): Promise<boolean> {
  return (await readVaultMeta()) !== undefined
}

/** 重置：删除整个数据库后重新打开空 schema，允许用户立即创建新保险库。 */
export async function destroyEverything(): Promise<void> {
  db.close()
  await Dexie.delete('card_manager')
  await db.open()
}
