// Anima — preload bridge. Exposes a small, safe API to the renderer.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('anima', {
  load: () => ipcRenderer.invoke('data:load'),
  save: (data) => ipcRenderer.invoke('data:save', data),
  synth: (args) => ipcRenderer.invoke('voice:synth', args),
  claudeStatus: () => ipcRenderer.invoke('claude:status'),
  claudeConnect: () => ipcRenderer.invoke('claude:connect'),
  claudeDisconnect: () => ipcRenderer.invoke('claude:disconnect'),
  setAutostart: (enabled) => ipcRenderer.invoke('app:setAutostart', enabled),
  onPlay: (cb) => {
    const h = (_e, b64) => cb(b64)
    ipcRenderer.on('anima:play', h)
    return () => ipcRenderer.removeListener('anima:play', h)
  },
  exportPersona: (card) => ipcRenderer.invoke('persona:export', card),
  importPersona: () => ipcRenderer.invoke('persona:import'),
  minimize: () => ipcRenderer.send('win:minimize'),
  hideToTray: () => ipcRenderer.send('win:hideToTray'),
  close: () => ipcRenderer.send('win:close'),
  quit: () => ipcRenderer.send('app:quit'),
  onExternalChange: (cb) => {
    const h = () => cb()
    ipcRenderer.on('anima:external-change', h)
    return () => ipcRenderer.removeListener('anima:external-change', h)
  },
})
