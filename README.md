# SG Diary (sgdiray)

基于最新 Electron (Chrome 152+) 的双平台桌面客户端，专为访问 `https://note.flynt.hk` 设计，全面支持 **Windows** 与 **macOS** 原生体验。

## 特性亮点

1. **双平台原生化顶部栏**
   - **Windows**: 采用纯 HTML/CSS 实现，高度精确匹配 Windows UWP / WinUI 标准（32px 高度，46×32 按钮规范），无边框沉浸设计。
   - **macOS**: 采用苹果原生无缝全高顶栏（`titleBarStyle: 'hidden'`），左上角标准红黄绿三色交通灯按钮（关闭、最小化、全屏缩放），自动隐藏 Windows 风格控制按钮。
   - **双平台实时自适应取色系统**：自动探测并跟随网页顶部的背景色（DOM 实时监听 + 底层像素采样双通道），使顶部栏与网页天衣无缝地融为一体。

2. **系统级深浅色模式自动适配与下达**
   - 原生监听系统颜色偏好切换（`nativeTheme`）。
   - Chromium 媒体模拟（`prefers-color-scheme`）与 CSS/DOM class 动态注入双通道下达深浅色模式至内嵌网页。

3. **macOS 原生快捷键与应用菜单**
   - 原生注册 macOS 标准应用菜单与快捷键支持（`Cmd+C` 复制、`Cmd+V` 粘贴、`Cmd+X` 剪切、`Cmd+A` 全选、`Cmd+Z` 撤销、`Cmd+Q` 退出、`Cmd+W` 关闭等）。

4. **专属应用图标 (Logo)**
   - 使用 `src/logo.svg` 自动渲染生成 1024×1024 高清 PNG、Windows 多分辨率 ICO（`assets/icon.ico`）以及 macOS 官方标准 ICNS（`assets/icon.icns`）。
   - 窗口运行时、Dock、任务栏图标与打包后的可执行文件均内嵌该 Logo。

---

## 快速运行与打包

### 开发启动
```bash
# 启动应用（Windows 下以 sgdiray.exe 进程运行，macOS 下以 Electron 原生进程运行）
npm start
```

### 生成/更新应用图标
```bash
# 从 src/logo.svg 自动重新渲染生成 assets/icon.png、assets/icon.ico 与 assets/icon.icns
npm run generate-icons
```

### 应用打包

#### 1. 打包 macOS 版本
> 注：macOS 格式建议在 macOS 环境或通过 GitHub Actions 自动构建，支持 DMG 镜像安装包与 ZIP 免安装包，适配 Apple Silicon (`arm64`) 与 Intel (`x64`)。

```bash
# 打包 macOS DMG 安装包与 ZIP 压缩包（输出至 dist/）
npm run dist:mac

# 仅打包 macOS 调试解压目录（输出至 dist/mac/ 或 dist/mac-arm64/）
npm run pack:mac
```

#### 2. 打包 Windows 版本
```bash
# 打包 Windows 安装包与便携版单文件（输出至 dist/）
npm run dist:win

# 仅打包 Windows 绿色解压目录（输出至 dist/win-unpacked/sgdiray.exe）
npm run pack:win
```

#### 3. 自动 CI/CD 构建
仓库已内置 GitHub Actions 工作流（`.github/workflows/build.yml`）：
- 只要向仓库推送带版本标签（如 `v1.0.0`），或在 GitHub Actions 页面手动点击 **Run workflow**，即可自动在云端 macOS 虚拟机与 Windows 虚拟机上完成 DMG、ZIP、EXE 的打包与产物上传。

---

## 项目结构

```
SGDiary/
├── .github/workflows/
│   └── build.yml              # GitHub Actions 自动化跨平台构建工作流 (macOS + Windows)
├── package.json               # 项目配置与打包设定 (支持 Windows 与 macOS)
├── assets/                    # 图标资源目录
│   ├── icon.icns              # macOS 官方标准多分辨率图标
│   ├── icon.ico               # Windows 多分辨率图标
│   └── icon.png               # 1024x1024 超清透明图标
├── scripts/
│   ├── generate-icons.js      # 自动化矢量 Logo 转 PNG/ICO/ICNS 工具
│   ├── setup-executable.js    # Windows sgdiray.exe 本地映射工具
│   └── start.js               # 跨平台智能启动器
└── src/
    ├── logo.svg               # 应用原始矢量设计 Logo
    ├── main.js                # 主进程（双平台无边框/交通灯、菜单、像素取色）
    ├── preload.js             # 预加载层（安全暴露平台与控制接口）
    ├── index.html             # 渲染层结构（沉浸顶部栏 + 内嵌 Webview）
    ├── renderer.js            # 渲染进程逻辑（平台自适应、顶部栏取色、主题下达）
    └── styles/
        ├── uwp-titlebar.css   # 双平台自适应顶部栏样式（WinUI 按钮 / macOS 交通灯占位）
        └── main.css           # 全局与内嵌 Webview 容器布局样式
```

