import { app, BrowserWindow } from 'electron';
import path from 'path';

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1000, // Start with a reasonable default size
    height: 700,
    // fullscreen: true, // Remove this to keep window controls
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Use preload script
      nodeIntegration: true, // Allow Node.js globals like require/exports in renderer
      contextIsolation: false // Needed for nodeIntegration:true in older Electron versions, disable for simplicity here
    }
  });

  mainWindow.maximize(); // Maximize the window on start

  // Load index.html directly from the src directory
  // The path needs to be relative to the project root when running electron .
  // Or relative to the compiled main.js in dist? Let's use absolute path relative to project root
  // mainWindow.loadFile(path.join(__dirname, '../dist/index.html')); // Old path
  mainWindow.loadFile(path.join(__dirname, '../src/index.html')); // Load from src

  // mainWindow.webContents.openDevTools(); // Optional: Open DevTools
  // mainWindow.webContents.openDevTools(); // Open DevTools automatically for debugging - Commented out for release build
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 