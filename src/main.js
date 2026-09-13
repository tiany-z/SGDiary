const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

// Set application name to sgdiray
app.name = 'sgdiray';

let mainWindow = null;

function createWindow() {
  const iconIco = path.join(__dirname, '..', 'assets', 'icon.ico');
  const iconPng = path.join(__dirname, '..', 'assets', 'icon.png');
  const appIcon = fs.existsSync(iconIco) ? iconIco : (fs.existsSync(iconPng) ? iconPng : undefined);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 400,
    minHeight: 300,
    frame: false, // Frameless window to remove default OS titlebar
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
