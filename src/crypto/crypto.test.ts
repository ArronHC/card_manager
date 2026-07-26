import { describe, expect, it } from 'vitest'
import { createVault, rewrapVault, unlockVault, WrongPinError } from './kdf'
import { DecryptError, seal, unseal } from './vault'

// PBKDF2 600k 次迭代在测试里每次调用约 0.3-0.5s，放宽超时
const SLOW = { timeout: 30_000 }

describe('保险库密钥链', () => {
  it('用正确 PIN 解锁后能读回加密内容', SLOW, async () => {
    const { meta, dek } = await createVault('123456')
    const sealed = await seal(dek, { fullNumber: '6222021234567890123' })

    const reopened = await unlockVault('123456', meta)
    const got = await unseal<{ fullNumber: string }>(reopened, sealed)
    expect(got.fullNumber).toBe('6222021234567890123')
  })

  it('PIN 错误时抛 WrongPinError 而不是返回垃圾数据', SLOW, async () => {
    const { meta } = await createVault('123456')
    await expect(unlockVault('654321', meta)).rejects.toBeInstanceOf(
      WrongPinError,
    )
  })

  it('改 PIN 后旧密文仍可用新 PIN 读出', SLOW, async () => {
    const { meta, dek } = await createVault('123456')
    const sealed = await seal(dek, { note: '工资卡' })

    const next = await rewrapVault('123456', 'abcdef', meta)
    const dek2 = await unlockVault('abcdef', next)
    expect(await unseal<{ note: string }>(dek2, sealed)).toEqual({
      note: '工资卡',
    })

    // 旧 PIN 应当立即失效
    await expect(unlockVault('123456', next)).rejects.toBeInstanceOf(
      WrongPinError,
    )
  })

  it('改 PIN 时旧 PIN 不对则拒绝，且原 meta 不受影响', SLOW, async () => {
    const { meta } = await createVault('123456')
    await expect(rewrapVault('000000', 'abcdef', meta)).rejects.toBeInstanceOf(
      WrongPinError,
    )
    await expect(unlockVault('123456', meta)).resolves.toBeDefined()
  })

  it('每次 seal 都使用不同 IV，相同明文产出不同密文', SLOW, async () => {
    const { dek } = await createVault('123456')
    const a = await seal(dek, 'same')
    const b = await seal(dek, 'same')
    expect(a.iv).not.toBe(b.iv)
    expect(a.ct).not.toBe(b.ct)
  })

  it('密文被篡改时解密失败而非静默返回', SLOW, async () => {
    const { dek } = await createVault('123456')
    const sealed = await seal(dek, { fullNumber: '6222021234567890123' })
    // 翻转 base64 中的一个字符
    const tampered = {
      ...sealed,
      ct: (sealed.ct[0] === 'A' ? 'B' : 'A') + sealed.ct.slice(1),
    }
    await expect(unseal(dek, tampered)).rejects.toBeInstanceOf(DecryptError)
  })

  it('密文绑定上下文，不能跨卡片替换', SLOW, async () => {
    const { dek } = await createVault('123456')
    const sealed = await seal(dek, { fullNumber: '6222021234567890123' }, 'card-a')
    await expect(unseal(dek, sealed, 'card-b')).rejects.toBeInstanceOf(DecryptError)
    await expect(unseal(dek, sealed, 'card-a')).resolves.toEqual({
      fullNumber: '6222021234567890123',
    })
  })

  it('不同保险库的 DEK 互不通用', SLOW, async () => {
    const v1 = await createVault('123456')
    const v2 = await createVault('123456')
    const sealed = await seal(v1.dek, 'secret')
    await expect(unseal(v2.dek, sealed)).rejects.toBeInstanceOf(DecryptError)
  })

  it('meta 中不出现任何明文密钥材料', SLOW, async () => {
    const { meta } = await createVault('123456')
    const serialized = JSON.stringify(meta)
    expect(serialized).not.toContain('123456')
    expect(meta.iterations).toBeGreaterThanOrEqual(600_000)
  })
})
