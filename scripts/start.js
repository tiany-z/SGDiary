const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const customExe = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'sgdiray.exe');
const defaultExe = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');

const targetExe = fs.existsSync(customExe) ? customExe : defaultExe;
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
