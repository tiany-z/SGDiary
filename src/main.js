const { app, BrowserWindow, ipcMain, nativeTheme, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const isMac = process.platform === 'darwin';

// Set application name to sgdiray
app.name = 'sgdiray';

let mainWindow = null;

function setupAppMenu() {
  if (isMac) {
    const template = [
      {
        label: app.name,
        submenu: [
          { role: 'about', label: `关于 ${app.name}` },
          { type: 'separator' },
          { role: 'services', label: '服务' },
          { type: 'separator' },
          { role: 'hide', label: `隐藏 ${app.name}` },
          { role: 'hideOthers', label: '隐藏其他' },
          { role: 'unhide', label: '显示全部' },
          { type: 'separator' },
          { role: 'quit', label: `退出 ${app.name}` }
        ]
      },
      {
        label: '编辑',
        submenu: [
          { role: 'undo', label: '撤销' },
          { role: 'redo', label: '重做' },
          { type: 'separator' },
          { role: 'cut', label: '剪切' },
          { role: 'copy', label: '复制' },
          { role: 'paste', label: '粘贴' },
          { role: 'selectAll', label: '全选' }
        ]
      },
      {
        label: '视图',
        submenu: [
          { role: 'reload', label: '重新加载' },
          { role: 'forceReload', label: '强制重新加载' },
          { role: 'toggleDevTools', label: '开发者工具' },
          { type: 'separator' },
          { role: 'resetZoom', label: '重置缩放' },
          { role: 'zoomIn', label: '放大' },
          { role: 'zoomOut', label: '缩小' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: '切换全屏' }
        ]
      },
      {
        label: '窗口',
        submenu: [
          { role: 'minimize', label: '最小化' },
          { role: 'zoom', label: '缩放' },
          { type: 'separator' },
          { role: 'front', label: '前置所有窗口' },
          { type: 'separator' },
          { role: 'close', label: '关闭' }
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    Menu.setApplicationMenu(null);
  }
}

function createWindow() {
  const iconIcns = path.join(__dirname, '..', 'assets', 'icon.icns');
  const iconIco = path.join(__dirname, '..', 'assets', 'icon.ico');
  const iconPng = path.join(__dirname, '..', 'assets', 'icon.png');
  
  let appIcon;
  if (isMac && fs.existsSync(iconIcns)) {
    appIcon = iconIcns;
  } else if (!isMac && fs.existsSync(iconIco)) {
    appIcon = iconIco;
  } else if (fs.existsSync(iconPng)) {
    appIcon = iconPng;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 400,
    minHeight: 300,
    frame: false, // Frameless window
    titleBarStyle: isMac ? 'hidden' : undefined,
    trafficLightPosition: isMac ? { x: 14, y: 9 } : undefined,
    show: false,
    icon: appIcon,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#202020' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true, // Enable <webview> tag
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Track maximize / unmaximize to update restore icon
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', { isMaximized: true });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', { isMaximized: false });
  });

  mainWindow.on('focus', () => {
    mainWindow.webContents.send('window-focus-changed', { isFocused: true });
  });

  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-focus-changed', { isFocused: false });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window control IPC handlers
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize-toggle', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return mainWindow.isMaximized();
  }
  return false;
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('get-system-theme', () => {
  return {
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  };
});

// Helper to apply theme to web contents safely
async function applyThemeToContents(contents, theme) {
  if (!contents || contents.isDestroyed()) return;
  const isDark = theme === 'dark';
  try {
    await contents.insertCSS(`
      :root {
        color-scheme: ${isDark ? 'dark' : 'light'} !important;
      }
    `);
  } catch (e) {}

  try {
    if (!contents.debugger.isAttached()) {
      contents.debugger.attach('1.3');
    }
    await contents.debugger.sendCommand('Emulation.setEmulatedMedia', {
      media: '',
      features: [{ name: 'prefers-color-scheme', value: isDark ? 'dark' : 'light' }]
    });
  } catch (e) {
    // Safely ignore if CDP cannot attach
  }
}

// Emulate color scheme on webview webContents
ipcMain.handle('sync-webview-theme', async (event, { webContentsId, theme }) => {
  const { webContents } = require('electron');
  const targetContents = webContents.fromId(webContentsId);
  if (targetContents) {
    await applyThemeToContents(targetContents, theme);
    return true;
  }
  return false;
});

// Capture and sample real-time color of the webpage's top strip
ipcMain.handle('capture-top-color', async (event, webContentsId) => {
  try {
    const { webContents } = require('electron');
    const targetContents = webContents.fromId(webContentsId);
    if (!targetContents || targetContents.isDestroyed()) return null;

    const image = await targetContents.capturePage({ x: 0, y: 0, width: 40, height: 10 });
    const bitmap = image.toBitmap(); // BGRA
    if (bitmap && bitmap.length >= 4) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      const pixelCount = Math.min(Math.floor(bitmap.length / 4), 40);
      for (let i = 0; i < pixelCount; i++) {
        const offset = i * 4;
        const b = bitmap[offset];
        const g = bitmap[offset + 1];
        const r = bitmap[offset + 2];
        const a = bitmap[offset + 3];
        if (a > 180) {
          rSum += r;
          gSum += g;
          bSum += b;
          count++;
        }
      }
      if (count > 0) {
        return {
          r: Math.round(rSum / count),
          g: Math.round(gSum / count),
          b: Math.round(bSum / count)
        };
      }
    }
  } catch (err) {
    // Ignore capture errors on navigation
  }
  return null;
});

// Broadcast system theme changes
nativeTheme.on('updated', () => {
  const currentTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('system-theme-changed', {
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
      theme: currentTheme
    });
  }
});

// Automatically apply theme styling to any newly created webContents (<webview>)
app.on('web-contents-created', (event, contents) => {
  contents.on('dom-ready', () => {
    const currentTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    applyThemeToContents(contents, currentTheme);
  });

  // Handle external navigation safely
  contents.setWindowOpenHandler(({ url }) => {
    return { action: 'allow' };
  });
});

app.whenReady().then(() => {
  setupAppMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
