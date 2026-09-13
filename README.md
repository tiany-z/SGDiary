# SG Diary (sgdiray.exe)

基于最新 Electron (Chrome 152+) 的桌面客户端，专为访问 `https://note.flynt.hk` 设计。

## 特性亮点

1. **微软 Windows UWP 沉浸式顶部栏**
   - 采用纯 HTML/CSS 实现，高度精确匹配 Windows UWP / WinUI 标准（32px 高度，46×32 按钮规范）。
   - 左上角无图标与标题文字干扰，整条顶部栏左侧均为原生拖拽区（`-webkit-app-region: drag`），支持双击最大化/向下还原。
   - **实时自动取色系统**：自动探测并跟随网页顶部的背景色（DOM 实时监听 + 底层像素采样双通道），使顶部栏与网页天衣无缝地融为一体。
   - 窗口控制按钮（最小化、还原、关闭）自动计算相对亮度，实现深色/浅色背景下的自适应高对比度图标与悬停反馈。
   - 向下还原按钮采用标准“前景方块自然遮挡后景方块”矢量路径，层次分明。

2. **系统级深浅色模式自动适配与下达**
   - 原生监听 Windows 系统颜色偏好切换（`nativeTheme`）。
   - Chromium 媒体模拟（`prefers-color-scheme`）与 CSS/DOM class 动态注入双通道下达深浅色模式至内嵌网页。

3. **最新 Chromium 内核**
   - 采用 Electron 44.3.0，内置最新 Chrome 152.0.7977.78 浏览器引擎。

4. **原生进程名称定制**
   - 无论是开发启动还是打包运行，进程名称均固定为 `sgdiray.exe`。

5. **专属应用图标 (Logo)**
   - 使用 `src/logo.svg` 自动渲染生成高清晰度 PNG（`assets/icon.png`）与 Windows 标准多分辨率 ICO（`assets/icon.ico`，内含 256、128、64、48、32、16 六种尺寸）。
   - 窗口运行时任务栏图标与打包后的可执行文件（`.exe`）均内嵌该 Logo。

---

## 快速运行与打包

### 开发启动
```bash
# 启动应用（以 sgdiray.exe 进程运行）
npm start
```

### 生成/更新应用图标
```bash
# 从 src/logo.svg 自动重新渲染生成 assets/icon.png 与 assets/icon.ico
npm run generate-icons
```

### 应用打包
```bash
# 1. 打包为绿色免安装运行目录（输出至 dist/win-unpacked/sgdiray.exe）
npm run pack

# 2. 打包生成便携版单文件和安装包（输出至 dist/）
npm run dist
```

---

## 项目结构

```
d:/Projects/sgdiary/
├── package.json               # 项目配置与打包设定 (sgdiray)
├── assets/                    # 图标资源目录
│   ├── icon.ico               # Windows 多分辨率图标（由 logo.svg 生成）
│   └── icon.png               # 256x256 高清透明图标
├── scripts/
│   ├── generate-icons.js      # 自动化矢量 Logo 转 PNG/ICO 工具
│   ├── setup-executable.js    # 生成本地 sgdiray.exe 映射执行文件
│   └── start.js               # 启动器（以 sgdiray.exe 启动应用）
└── src/
    ├── logo.svg               # 应用原始矢量设计 Logo
    ├── main.js                # 主进程（无边框窗口、主题监听、像素取色、Logo挂载）
    ├── preload.js             # 预加载层（安全暴露窗口控制与主题接口）
    ├── index.html             # 渲染层结构（UWP 沉浸顶部栏 + 内嵌 Webview）
    ├── renderer.js            # 渲染进程逻辑（顶部栏取色、对比度自适应、主题下达）
    └── styles/
        ├── uwp-titlebar.css   # 微软 UWP / WinUI 风格标题栏样式
        └── main.css           # 全局与内嵌 Webview 容器布局样式
```
