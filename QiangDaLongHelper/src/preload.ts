// This preload script runs before the renderer process is loaded.
// It has access to both DOM APIs and Node.js environment.
// Use contextBridge to selectively expose Node.js/Electron APIs to the renderer process for security.

// Example using contextBridge (requires contextIsolation: true in webPreferences, which is default)
/*
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Example: function to send data to the main process
  sendData: (channel: string, data: any) => {
    // Whitelist channels
    const validChannels = ['data-channel'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // Example: function to receive data from the main process
  handleData: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['reply-channel'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
*/

console.log('Preload script loaded'); 