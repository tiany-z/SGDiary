// Renderer process logic for SG Diary with Real-Time Adaptive Top Bar

document.addEventListener('DOMContentLoaded', async () => {
  const titlebar = document.getElementById('titlebar');
  const dragRegion = document.getElementById('drag-region');
  const btnMinimize = document.getElementById('btn-minimize');
  const btnMaximize = document.getElementById('btn-maximize');
  const btnClose = document.getElementById('btn-close');
  const iconMaximize = document.getElementById('icon-maximize');
  const iconRestore = document.getElementById('icon-restore');
  
  const webView = document.getElementById('web-view');
  const loadingBar = document.getElementById('loading-bar');
  const errorView = document.getElementById('error-view');
  const btnRetry = document.getElementById('btn-retry');

  let currentTheme = 'light';

  const isMac = window.electronAPI && window.electronAPI.platform === 'darwin';
  if (isMac) {
    document.body.classList.add('platform-mac');
  }

  // --- Window Controls ---
  if (!isMac) {
    btnMinimize.addEventListener('click', () => {
      window.electronAPI.minimize();
    });

    btnMaximize.addEventListener('click', async () => {
      const isMax = await window.electronAPI.toggleMaximize();
      updateMaximizeIcon(isMax);
    });

    btnClose.addEventListener('click', () => {
      window.electronAPI.close();
    });
  }

  // Double click drag region to maximize/restore (works on both platforms)
  dragRegion.addEventListener('dblclick', async () => {
    const isMax = await window.electronAPI.toggleMaximize();
    if (!isMac) {
      updateMaximizeIcon(isMax);
    }
  });

  function updateMaximizeIcon(isMaximized) {
    if (isMaximized) {
      iconMaximize.style.display = 'none';
      iconRestore.style.display = 'block';
      btnMaximize.setAttribute('title', '向下还原');
      btnMaximize.setAttribute('aria-label', '向下还原');
    } else {
      iconMaximize.style.display = 'block';
      iconRestore.style.display = 'none';
      btnMaximize.setAttribute('title', '最大化');
      btnMaximize.setAttribute('aria-label', '最大化');
    }
  }

  // Sync initial window maximize state
  try {
    const initialMax = await window.electronAPI.isMaximized();
    updateMaximizeIcon(initialMax);
  } catch (err) {
    console.warn('Could not retrieve initial maximize state:', err);
  }

  // Listen to window state updates from main process
  window.electronAPI.onWindowStateChanged(({ isMaximized }) => {
    updateMaximizeIcon(isMaximized);
  });

  window.electronAPI.onWindowFocusChanged(({ isFocused }) => {
    if (isFocused) {
      titlebar.classList.remove('inactive');
    } else {
      titlebar.classList.add('inactive');
    }
  });

  // --- Real-Time Adaptive Titlebar Color System ---
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 1;
  colorCanvas.height = 1;
  const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });

  function parseCssColor(colorStr) {
    if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit') return null;
    try {
      colorCtx.clearRect(0, 0, 1, 1);
      colorCtx.fillStyle = colorStr;
      colorCtx.fillRect(0, 0, 1, 1);
      const data = colorCtx.getImageData(0, 0, 1, 1).data;
      if (data[3] === 0) return null;
      return { r: data[0], g: data[1], b: data[2] };
    } catch (e) {
      return null;
    }
  }

  function applyTitlebarRgb(r, g, b) {
    // Relative luminance calculation for high-contrast controls
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const isDark = luminance < 0.5;
    const rgbStr = `rgb(${r}, ${g}, ${b})`;

    titlebar.style.backgroundColor = rgbStr;
    titlebar.style.setProperty('--uwp-bg', rgbStr);
    titlebar.style.setProperty('--uwp-color', isDark ? '#ffffff' : '#1a1a1a');
    titlebar.style.setProperty('--uwp-icon-color', isDark ? '#ffffff' : '#1a1a1a');
    titlebar.style.setProperty('--uwp-border', isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)');
    titlebar.style.setProperty('--uwp-btn-hover', isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)');
    titlebar.style.setProperty('--uwp-btn-active', isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(0, 0, 0, 0.12)');
  }

  // Real-time pixel capture sampling via main process
  let isCapturing = false;
  async function sampleTopPixels() {
    if (isCapturing || !webView) return;
    isCapturing = true;
    try {
      const wcId = webView.getWebContentsId();
      if (wcId) {
        const color = await window.electronAPI.captureTopColor(wcId);
        if (color) {
          applyTitlebarRgb(color.r, color.g, color.b);
        }
      }
    } catch (e) {
    } finally {
      isCapturing = false;
    }
  }

  // In-page real-time color observer script
  const colorObserverScript = `
    (function() {
      if (window.__SG_COLOR_OBSERVER_INIT__) return;
      window.__SG_COLOR_OBSERVER_INIT__ = true;

      function getTopBgColor() {
        // 1. Check meta theme-color
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta && meta.content) return meta.content;

        // 2. Check elements across the top bar
        var samplePoints = [
          { x: 20, y: 8 },
          { x: Math.floor(window.innerWidth / 2), y: 8 },
          { x: 80, y: 5 }
        ];

        for (var i = 0; i < samplePoints.length; i++) {
          var pt = samplePoints[i];
          var el = document.elementFromPoint(pt.x, pt.y);
          while (el && el !== document.documentElement) {
            var bg = window.getComputedStyle(el).backgroundColor;
            if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
              return bg;
            }
            el = el.parentElement;
          }
        }

        // 3. Fallback to body or html background
        if (document.body) {
          var bodyBg = window.getComputedStyle(document.body).backgroundColor;
          if (bodyBg && bodyBg !== 'transparent' && bodyBg !== 'rgba(0, 0, 0, 0)') {
            return bodyBg;
          }
        }
        var htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
        if (htmlBg && htmlBg !== 'transparent' && htmlBg !== 'rgba(0, 0, 0, 0)') {
          return htmlBg;
        }

        return null;
      }

      var lastSentColor = '';
      function checkAndReport() {
        var color = getTopBgColor();
        if (color && color !== lastSentColor) {
          lastSentColor = color;
          console.log('__SG_TOP_COLOR__:' + color);
        }
      }

      checkAndReport();

      // MutationObserver to watch theme/DOM changes
      var observer = new MutationObserver(function() {
        checkAndReport();
      });
      observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });

      // Scroll listener to update color if top banner changes
      var scrollTimeout;
      window.addEventListener('scroll', function() {
        if (!scrollTimeout) {
          scrollTimeout = setTimeout(function() {
            scrollTimeout = null;
            checkAndReport();
          }, 80);
        }
      }, { passive: true });
    })();
  `;

  // Listen for real-time color broadcasts from the webview
  webView.addEventListener('console-message', (e) => {
    if (e.message && e.message.startsWith('__SG_TOP_COLOR__:')) {
      const colorStr = e.message.slice('__SG_TOP_COLOR__:'.length).trim();
      const parsed = parseCssColor(colorStr);
      if (parsed) {
        applyTitlebarRgb(parsed.r, parsed.g, parsed.b);
      }
    }
  });

  // --- Theme Management & Propagation to Webpage ---
  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    
    // Default fallback color if webview is not loaded yet
    if (!titlebar.style.backgroundColor) {
      if (theme === 'dark') {
        applyTitlebarRgb(32, 32, 32);
      } else {
        applyTitlebarRgb(249, 249, 249);
      }
    }

    syncThemeToWebview(theme);
    setTimeout(sampleTopPixels, 150);
  }

  function syncThemeToWebview(theme) {
    if (!webView) return;
    const isDark = theme === 'dark';

    // 1. Sync theme to main process webContents
    try {
      const wcId = webView.getWebContentsId();
      if (wcId) {
        window.electronAPI.syncWebviewTheme(wcId, theme);
      }
    } catch (e) {}

    // 2. Inject CSS for color-scheme override
    const cssToInject = `
      :root {
        color-scheme: ${isDark ? 'dark' : 'light'} !important;
      }
    `;
    try {
      webView.insertCSS(cssToInject).catch(() => {});
    } catch (e) {}

    // 3. Inject DOM script for modern web frameworks
    const scriptToInject = `
      (function() {
        try {
          var isDark = ${isDark};
          var mode = isDark ? 'dark' : 'light';
          
          if (isDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
          }
          document.documentElement.setAttribute('data-theme', mode);
          document.documentElement.style.colorScheme = mode;

          window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: mode, isDark: isDark } }));
        } catch (e) {}
      })();
    `;
    try {
      webView.executeJavaScript(scriptToInject).catch(() => {});
    } catch (e) {}

    // 4. Inject color observer
    try {
      webView.executeJavaScript(colorObserverScript).catch(() => {});
    } catch (e) {}
  }

  // Get initial system theme
  try {
    const systemTheme = await window.electronAPI.getSystemTheme();
    applyTheme(systemTheme.theme);
  } catch (err) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  // Listen for system theme changes in real time
  window.electronAPI.onSystemThemeChanged(({ theme }) => {
    applyTheme(theme);
  });

  // --- Webview Event Handlers ---
  webView.addEventListener('page-title-updated', (event) => {
    if (event.title) {
      document.title = `${event.title} - SG Diary`;
    }
  });

  webView.addEventListener('did-start-loading', () => {
    loadingBar.className = 'loading-bar active';
  });

  webView.addEventListener('did-stop-loading', () => {
    loadingBar.className = 'loading-bar completed';
    setTimeout(() => {
      loadingBar.className = 'loading-bar';
    }, 400);

    // Synchronize theme and sample top color on load completion
    syncThemeToWebview(currentTheme);
    setTimeout(sampleTopPixels, 120);
    setTimeout(sampleTopPixels, 500);
  });

  webView.addEventListener('dom-ready', () => {
    syncThemeToWebview(currentTheme);
    setTimeout(sampleTopPixels, 100);
  });

  webView.addEventListener('did-fail-load', (event) => {
    if (event.errorCode !== -3) {
      errorView.classList.add('show');
    }
  });

  btnRetry.addEventListener('click', () => {
    errorView.classList.remove('show');
    webView.reload();
  });
});
