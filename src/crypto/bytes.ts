/** 字节与 base64 之间的转换。密文在 IndexedDB 里以 base64 字符串存放， */
/** 一是方便在 DevTools 里肉眼确认确实是密文，二是导出备份时不用再转格式。 */

export function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length)
  crypto.getRandomValues(out)
  return out
}

export function toBase64(bytes: Uint8Array | ArrayBuffer): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  // 分块避免 String.fromCharCode 参数过多（大数据时会栈溢出）
  const CHUNK = 0x8000
  for (let i = 0; i < view.length; i += CHUNK) {
    binary += String.fromCharCode(...view.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
  return out
}

export function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

export function fromUtf8(bytes: Uint8Array | ArrayBuffer): string {
  return new TextDecoder().decode(bytes)
}

/** 尽力覆盖内存中的敏感字节。JS 无法保证不留副本，但能减少驻留时间。 */
export function wipe(bytes: Uint8Array): void {
  bytes.fill(0)
}
