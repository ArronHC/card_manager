# 卡包（card_manager）

一款只在 Android 本机运行的银行卡/证件卡管理应用。使用 React、TypeScript、Dexie 和 Capacitor 构建，支持 BIN 自动识别银行与卡组织、Wallet 式卡片堆叠、搜索、标签、编辑和删除。

## 安全设计

- 无服务器、无账号、无云同步。只有在本地 BIN 表无法识别发卡行时，App 才会通过 HTTPS 向 Binlist 查询卡号前 8 位 IIN；不会上传完整卡号、末四位、持卡人或备注。
- 完整卡号、持卡人、预留手机号和备注使用 AES-GCM 加密后存入 IndexedDB。
- 用户 PIN 经 PBKDF2-SHA256（600,000 次迭代）包裹数据密钥；Android 端的包裹元数据还会由 Android Keystore 支持的 SecureStorage 再保护一层。
- IndexedDB 中除随机记录 ID、排序与时间戳外，卡片名称、银行、BIN、末四位、标签及全部敏感字段均位于 AES-GCM 密文中。
- 每条卡片使用独立随机 IV，并通过 AES-GCM Additional Authenticated Data 与记录 ID 绑定，防止密文跨记录替换。
- 完整卡号默认遮码，只在用户主动点击后显示。
- 复制卡号后会尝试在 30 秒后清空剪贴板；若剪贴板内容已被替换，则不会清除新内容。
- 应用进入后台后立即卸载解密后的卡片、详情和表单状态；不可导出的 DEK 最多只在当前进程内保留 5 分钟。5 分钟内返回免输 PIN，超时、手动锁定、强停、进程死亡或设备重启后必须重新输入 PIN。
- Android 窗口启用 `FLAG_SECURE`，禁止系统截图、录屏和最近任务中的明文预览。
- 正式交付使用不可调试的 release APK；WebView 调试在所有构建中均显式关闭。
- 有意不提供 CVV/CVN2、查询密码或交易密码字段，避免把可直接用于交易的敏感组合存到同一设备。

> **重要：忘记 PIN 后，现有数据将永久无法解密。** 应用没有后门、找回密码或云端恢复机制。重置只会清空本机数据。

## 环境要求

- Node.js 20 或更高版本
- JDK 21
- Android SDK Platform 36 / Build Tools 36
- Android 设备或模拟器（最低 Android 7.0，API 24）

## 开发

```bash
npm install
npm run dev
```

浏览器仅用于开发调试；正式交付目标是 Android APK。

## 测试与生产构建

```bash
npm run test
npx tsc -b --noEmit
npm run build
```

## 构建 Android APK

首次生成 Android 工程：

```bash
npx cap add android
```

同步 Web 资源并生成本地调试 APK：

```bash
npm run android:apk
```

调试包使用独立的 `com.cardmanager.app.dev` ID，不能覆盖正式保险库，且不应对外分发。

生成不可调试的 release APK（正式交付应使用此命令，并在发布前配置自己的签名）：

```bash
npm run android:release
```

> Capacitor 8 的 Android 构建要求 Gradle 使用 JDK 21。请确认 `JAVA_HOME` 指向 JDK 21，而不仅是 `java -version` 显示 21。

生成文件位于：

```text
android/app/build/outputs/apk/debug/app-debug.apk
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

`app-release-unsigned.apk` 必须使用你自己的长期发布密钥签名后才能正式分发。不要用开发机的 debug keystore 发布生产版本。


## 安装到设备

先在 Android 设备上启用开发者选项和 USB/无线调试，然后执行：

```bash
adb devices
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

如果设备显示 `offline`，请在手机上重新确认调试授权，或重连无线调试后再安装。

## 数据范围与已知取舍

- 所有数据只存在当前 Android 设备中，浏览器调试环境与安装后的 App 不共享数据库。
- 暂不提供数据导出、跨设备迁移、云同步或 PIN 恢复。
- BIN 数据可能随银行发卡策略变化；本地表未命中时，Android App 会把前 8 位 IIN 发往 `lookup.binlist.net` 查询具体银行。第三方可观察请求 IP 与这 8 位前缀，查询结果也可能缺漏或受限流影响；失败时可手动填写银行和卡面颜色。
- 在线识别仅使用 HTTPS，Android 禁止明文 HTTP；完整卡号和个人资料不会进入查询请求。
- 卡号的 Luhn 校验是软提示，不阻止保存，证件卡可忽略该提示。
