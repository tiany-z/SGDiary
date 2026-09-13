const fs = require('fs');
const path = require('path');

function setupExecutable() {
  const electronDistDir = path.join(__dirname, '..', 'node_modules', 'electron', 'dist');
  const originalExe = path.join(electronDistDir, 'electron.exe');
  const customExe = path.join(electronDistDir, 'sgdiray.exe');

  if (fs.existsSync(originalExe)) {
    try {
      if (!fs.existsSync(customExe)) {
        fs.copyFileSync(originalExe, customExe);
        console.log(`[setup-executable] Successfully created: ${customExe}`);
      } else {
        console.log(`[setup-executable] Custom executable already exists: ${customExe}`);
      }
    } catch (err) {
      console.warn(`[setup-executable] Could not create sgdiray.exe:`, err.message);
    }
  }
}

setupExecutable();
