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

  // Create an offscreen window to render SVG at ultra-high resolution (1024x1024)
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
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
          body { width: 1024px; height: 1024px; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; }
          svg { width: 1024px; height: 1024px; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  // Wait briefly for rendering
  await new Promise((resolve) => setTimeout(resolve, 400));

  const image1024 = await win.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
  const png1024 = image1024.toPNG();
  const pngPath = path.join(assetsDir, 'icon.png');
  fs.writeFileSync(pngPath, png1024);
  console.log(`[generate-icons] Saved 1024x1024 PNG to: ${pngPath}`);

  // Create standard scaled image buffers
  const sizes = [1024, 512, 256, 128, 64, 48, 32, 16];
  const pngMap = {};

  for (const size of sizes) {
    if (size === 1024) {
      pngMap[size] = png1024;
    } else {
      const resized = image1024.resize({ width: size, height: size, quality: 'best' });
      pngMap[size] = resized.toPNG();
    }
  }

  // --- 1. Generate standard Windows .ICO file ---
  const icoSizes = [256, 128, 64, 48, 32, 16];
  const icoNumImages = icoSizes.length;
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // icon type (1)
  icoHeader.writeUInt16LE(icoNumImages, 4); // count

  const icoDirEntries = [];
  let icoOffset = 6 + (icoNumImages * 16);

  for (const size of icoSizes) {
    const buf = pngMap[size];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buf.length, 8); // size
    entry.writeUInt32LE(icoOffset, 12); // offset
    icoDirEntries.push(entry);

    icoOffset += buf.length;
  }

  const icoBuffer = Buffer.concat([
    icoHeader,
    ...icoDirEntries,
    ...icoSizes.map(s => pngMap[s])
  ]);

  const icoPath = path.join(assetsDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`[generate-icons] Saved multi-resolution Windows ICO to: ${icoPath}`);

  // --- 2. Generate standard Apple macOS .ICNS file ---
  // Modern macOS icns chunk tags mapping to PNG payloads
  const icnsEntries = [
    { tag: 'icp4', buffer: pngMap[16] },   // 16x16
    { tag: 'icp5', buffer: pngMap[32] },   // 32x32
    { tag: 'ic11', buffer: pngMap[32] },   // 16x16@2x
    { tag: 'icp6', buffer: pngMap[64] },   // 64x64
    { tag: 'ic12', buffer: pngMap[64] },   // 32x32@2x
    { tag: 'ic07', buffer: pngMap[128] },  // 128x128
    { tag: 'ic08', buffer: pngMap[256] },  // 256x256
    { tag: 'ic13', buffer: pngMap[256] },  // 128x128@2x
    { tag: 'ic09', buffer: pngMap[512] },  // 512x512
    { tag: 'ic14', buffer: pngMap[512] },  // 256x256@2x
    { tag: 'ic10', buffer: pngMap[1024] }  // 1024x1024 (512x512@2x)
  ];

  let icnsTotalLength = 8;
  const icnsChunkBuffers = [];

  for (const entry of icnsEntries) {
    const chunkLength = 8 + entry.buffer.length;
    icnsTotalLength += chunkLength;

    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write(entry.tag, 0, 4, 'ascii');
    chunkHeader.writeUInt32BE(chunkLength, 4);

    icnsChunkBuffers.push(chunkHeader, entry.buffer);
  }

  const icnsFileHeader = Buffer.alloc(8);
  icnsFileHeader.write('icns', 0, 4, 'ascii');
  icnsFileHeader.writeUInt32BE(icnsTotalLength, 4);

  const icnsBuffer = Buffer.concat([icnsFileHeader, ...icnsChunkBuffers]);
  const icnsPath = path.join(assetsDir, 'icon.icns');
  fs.writeFileSync(icnsPath, icnsBuffer);
  console.log(`[generate-icons] Saved multi-resolution macOS ICNS to: ${icnsPath}`);

  win.destroy();
  app.quit();
});
