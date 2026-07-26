import { fromBase64, randomBytes, toBase64, utf8, wipe } from './bytes'

/**
 * 密钥派生。
 *
 * 两级密钥：
 *   PIN --PBKDF2--> KEK（密钥加密密钥，只用来包裹 DEK，绝不直接加密数据）
 *   DEK（随机 256-bit 数据密钥）--AES-GCM(KEK)--> 密文存库
 *
 * 这样改 PIN 只需重新包裹 DEK，不必把所有卡片重新加密一遍。
 */

/** OWASP 2023 对 PBKDF2-HMAC-SHA256 的推荐下限；写进 meta 便于日后提升。 */
export const DEFAULT_ITERATIONS = 600_000

export const SALT_BYTES = 16
export const IV_BYTES = 12
export const DEK_BYTES = 32

/** 持久化到 IndexedDB 的保险库元数据。不含任何可直接还原 DEK 的信息。 */
export interface VaultMeta {
  version: 1
  /** PBKDF2 盐，base64 */
  salt: string
  iterations: number
  /** 包裹 DEK 所用的 IV，base64 */
  wrapIv: string
  /** KEK 加密后的 DEK，base64（含 GCM 认证标签） */
  wrappedDek: string
  createdAt: number
  updatedAt: number
}

/** PIN 错误（GCM 认证失败）时抛出，与「数据损坏」区分开由调用方决定文案。 */
export class WrongPinError extends Error {
  constructor() {
    super('PIN 不正确')
    this.name = 'WrongPinError'
  }
}

async function deriveKek(
  pin: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const pinBytes = utf8(pin)
  const baseKey = await crypto.subtle.importKey(
    'raw',
    pinBytes as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  wipe(pinBytes)
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** 把 32 字节原始密钥导入成不可导出的 CryptoKey —— DEK 一旦导入就无法再取回明文。 */
async function importDek(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    raw as BufferSource,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** 首次设置 PIN：生成 DEK 并用 PIN 派生的 KEK 包裹。 */
export async function createVault(
  pin: string,
  now: number = Date.now(),
): Promise<{ meta: VaultMeta; dek: CryptoKey }> {
  const salt = randomBytes(SALT_BYTES)
  const wrapIv = randomBytes(IV_BYTES)
  const rawDek = randomBytes(DEK_BYTES)

  const kek = await deriveKek(pin, salt, DEFAULT_ITERATIONS)
  const wrapped = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: wrapIv as BufferSource },
    kek,
    rawDek as BufferSource,
  )
  const dek = await importDek(rawDek)
  // 明文 DEK 用完立刻抹掉，之后只以不可导出的 CryptoKey 形态存在
  wipe(rawDek)

  return {
    meta: {
      version: 1,
      salt: toBase64(salt),
      iterations: DEFAULT_ITERATIONS,
      wrapIv: toBase64(wrapIv),
      wrappedDek: toBase64(wrapped),
      createdAt: now,
      updatedAt: now,
    },
    dek,
  }
}

/** 用 PIN 解开 DEK。PIN 错误时 GCM 认证失败，转成 WrongPinError。 */
export async function unlockVault(
  pin: string,
  meta: VaultMeta,
): Promise<CryptoKey> {
  const salt = fromBase64(meta.salt)
  const wrapIv = fromBase64(meta.wrapIv)
  const kek = await deriveKek(pin, salt, meta.iterations)

  let rawDek: Uint8Array
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: wrapIv as BufferSource },
      kek,
      fromBase64(meta.wrappedDek) as BufferSource,
    )
    rawDek = new Uint8Array(plain)
  } catch {
    throw new WrongPinError()
  }

  const dek = await importDek(rawDek)
  wipe(rawDek)
  return dek
}

/**
 * 改 PIN：校验旧 PIN 拿到 DEK 原文后，换新盐新 IV 重新包裹。
 * 卡片密文完全不动。
 */
export async function rewrapVault(
  oldPin: string,
  newPin: string,
  meta: VaultMeta,
  now: number = Date.now(),
): Promise<VaultMeta> {
  const oldSalt = fromBase64(meta.salt)
  const oldKek = await deriveKek(oldPin, oldSalt, meta.iterations)

  let rawDek: Uint8Array
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(meta.wrapIv) as BufferSource },
      oldKek,
      fromBase64(meta.wrappedDek) as BufferSource,
    )
    rawDek = new Uint8Array(plain)
  } catch {
    throw new WrongPinError()
  }

  const salt = randomBytes(SALT_BYTES)
  const wrapIv = randomBytes(IV_BYTES)
  const newKek = await deriveKek(newPin, salt, DEFAULT_ITERATIONS)
  const wrapped = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: wrapIv as BufferSource },
    newKek,
    rawDek as BufferSource,
  )
  wipe(rawDek)

  return {
    ...meta,
    version: 1,
    salt: toBase64(salt),
    iterations: DEFAULT_ITERATIONS,
    wrapIv: toBase64(wrapIv),
    wrappedDek: toBase64(wrapped),
    updatedAt: now,
  }
}
