import { Clipboard } from '@capacitor/clipboard'
import { Capacitor } from '@capacitor/core'

/**
 * 剪贴板统一入口。Android WebView 的 navigator.clipboard 受安全上下文
 * 与焦点限制，真机上经常直接 undefined 或抛 NotAllowedError，
 * 原生端一律走 Capacitor 插件。
 */

export async function writeClipboard(text: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Clipboard.write({ string: text })
    return
  }
  await navigator.clipboard.writeText(text)
}

/** 读取失败（权限/焦点）返回 null，调用方据此跳过而不是误清。 */
export async function readClipboard(): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { type, value } = await Clipboard.read()
      return type.startsWith('text/') ? value : null
    }
    return await navigator.clipboard.readText()
  } catch {
    return null
  }
}
