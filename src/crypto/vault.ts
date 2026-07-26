import { fromBase64, fromUtf8, randomBytes, toBase64, utf8 } from './bytes'
import { IV_BYTES } from './kdf'

/**
 * 字段级加解密。每条记录的敏感部分序列化成 JSON 后用 DEK 加密，
 * 每次加密都用全新随机 IV（GCM 下 IV 重用会直接摧毁安全性）。
 */

/** 落库的密文信封。iv 与 ct 均为 base64。 */
export interface Sealed {
  iv: string
  ct: string
}

export class DecryptError extends Error {
  constructor() {
    super('数据解密失败')
    this.name = 'DecryptError'
  }
}

export async function seal(
  dek: CryptoKey,
  value: unknown,
  context?: string,
): Promise<Sealed> {
  const iv = randomBytes(IV_BYTES)
  const plain = utf8(JSON.stringify(value))
  const ct = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      additionalData: context ? (utf8(context) as BufferSource) : undefined,
    },
    dek,
    plain as BufferSource,
  )
  return { iv: toBase64(iv), ct: toBase64(ct) }
}

export async function unseal<T>(
  dek: CryptoKey,
  sealed: Sealed,
  context?: string,
): Promise<T> {
  try {
    const plain = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64(sealed.iv) as BufferSource,
        additionalData: context ? (utf8(context) as BufferSource) : undefined,
      },
      dek,
      fromBase64(sealed.ct) as BufferSource,
    )
    return JSON.parse(fromUtf8(plain)) as T
  } catch {
    throw new DecryptError()
  }
}
