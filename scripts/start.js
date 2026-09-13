const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let targetExe;
if (process.platform === 'win32') {
  const customExe = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'sgdiray.exe');
  if (fs.existsSync(customExe)) {
    targetExe = customExe;
  }
}

if (!targetExe) {
  try {
    targetExe = require('electron');
  } catch (e) {
    targetExe = 'electron';
  }
}

const appDir = path.join(__dirname, '..');
console.log(`[start] Launching process with: ${targetExe}`);

const child = spawn(targetExe, ['.'], {
  cwd: appDir,
  stdio: 'inherit',
  windowsHide: false
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
