import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.cardmanager.app',
  appName: '卡包',
  webDir: 'dist',
  android: {
    // 关闭 WebView 的下拉刷新手势，避免和 Wallet 卡片堆叠的滚动/拖拽冲突
    allowMixedContent: false,
    backgroundColor: '#0b0b0f',
    // 即使误装调试包，也不允许 Chrome DevTools 读取已解密的 WebView。
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0b0b0f',
      overlaysWebView: true,
    },
  },
}

export default config
