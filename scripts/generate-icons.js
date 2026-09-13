const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, nativeImage } = require('electron');

app.whenReady().then(async () => {
  const assetsDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const svgPath = path.join(__dirname, '..', 'src', 'logo.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  // Create an offscreen window to render SVG at high resolution (256x256)
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    webPreferences: {
      offscreen: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: 256px; height: 256px; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; }
          svg { width: 256px; height: 256px; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  // Wait briefly for rendering
  await new Promise((resolve) => setTimeout(resolve, 300));

  const image256 = await win.capturePage({ x: 0, y: 0, width: 256, height: 256 });
  const png256 = image256.toPNG();
  const pngPath = path.join(assetsDir, 'icon.png');
  fs.writeFileSync(pngPath, png256);
  console.log(`[generate-icons] Saved 256x256 PNG to: ${pngPath}`);

  // Also create smaller sizes for multi-resolution ICO: 128, 64, 48, 32, 16
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngBuffers = [];

  for (const size of sizes) {
    if (size === 256) {
      pngBuffers.push({ size, buffer: png256 });
    } else {
      const resized = image256.resize({ width: size, height: size, quality: 'best' });
      pngBuffers.push({ size, buffer: resized.toPNG() });
    }
  }

  // Build standard Windows .ICO file with PNG payloads
  // Header: 6 bytes
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon type (1)
  header.writeUInt16LE(numImages, 4); // count

  const dirEntries = [];
  let currentOffset = 6 + (numImages * 16);

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 0); // width
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 1); // height
    entry.writeUInt8(0, 2); // colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(item.buffer.length, 8); // size
    entry.writeUInt32LE(currentOffset, 12); // offset
    dirEntries.push(entry);

    currentOffset += item.buffer.length;
  }

  const icoBuffer = Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map(p => p.buffer)
  ]);

  const icoPath = path.join(assetsDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`[generate-icons] Saved multi-resolution Windows ICO to: ${icoPath}`);

  win.destroy();
  app.quit();
});
