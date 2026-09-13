const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window-maximize-toggle'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  syncWebviewTheme: (webContentsId, theme) => ipcRenderer.invoke('sync-webview-theme', { webContentsId, theme }),
  captureTopColor: (webContentsId) => ipcRenderer.invoke('capture-top-color', webContentsId),

  onSystemThemeChanged: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('system-theme-changed', subscription);
    return () => ipcRenderer.removeListener('system-theme-changed', subscription);
  },

  onWindowStateChanged: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('window-state-changed', subscription);
    return () => ipcRenderer.removeListener('window-state-changed', subscription);
  },

  onWindowFocusChanged: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('window-focus-changed', subscription);
    return () => ipcRenderer.removeListener('window-focus-changed', subscription);
  }
});
