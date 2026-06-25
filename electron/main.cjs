// Anima — Electron main process.
// Owns the frameless window, the system tray, and all on-disk data + file dialogs.
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const store = require('./store.cjs')
const voice = require('./voice.cjs')
const claude = require('./claude.cjs')
const voiceServer = require('./voiceServer.cjs')

function ensureVoiceServer() {
  voiceServer.start(claude.PORT, (b64) => { if (win && !win.isDestroyed()) win.webContents.send('anima:play', b64) })
}

const ICON = path.join(__dirname, '..', 'assets', 'icon.png')
let win = null
let tray = null
let quitting = false

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 782,
    minWidth: 1000,
    minHeight: 680,
    frame: false,
    show: false,
    backgroundColor: '#15131E',
    icon: ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.ANIMA_DEV) {
    win.loadURL('http://localhost:5234')
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
  if (process.env.ANIMA_DEBUG) win.webContents.openDevTools({ mode: 'detach' })

  win.once('ready-to-show', () => win.show())

  // Closing the window hides to tray instead of quitting (unless really quitting).
  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      win.hide()
    }
  })
}

function trayIcon() {
  try {
    const img = nativeImage.createFromPath(ICON)
    if (!img.isEmpty()) return img.resize({ width: 18, height: 18 })
  } catch (e) { /* fall through */ }
  return nativeImage.createEmpty()
}

function buildTrayMenu() {
  const data = store.load()
  const active = data.cards.find((c) => c.id === data.state.activeId)
  const switchItems = data.cards.map((c) => ({
    label: `${c.name}${c.id === data.state.activeId ? '  ✓' : ''}`,
    click: () => setActive(c.id),
  }))
  return Menu.buildFromTemplate([
    { label: active ? `Active: ${active.name}` : 'Anima', enabled: false },
    { type: 'separator' },
    { label: 'Show Anima', click: showWindow },
    { type: 'separator' },
    { label: 'Switch character', enabled: false },
    ...switchItems,
    { type: 'separator' },
    { label: 'Quit Anima', click: () => { quitting = true; app.quit() } },
  ])
}

function refreshTray() {
  if (tray) tray.setContextMenu(buildTrayMenu())
}

function setActive(id) {
  const data = store.load()
  data.state.activeId = id
  store.save(data)
  refreshTray()
  if (win) win.webContents.send('anima:external-change')
}

function showWindow() {
  if (!win) createWindow()
  else { win.show(); win.focus() }
}

function createTray() {
  tray = new Tray(trayIcon())
  tray.setToolTip('Anima')
  tray.on('click', showWindow)
  refreshTray()
}

// ---- IPC: data ----
ipcMain.handle('data:load', () => store.load())
ipcMain.handle('data:save', (_e, data) => { const ok = store.save(data); refreshTray(); return ok })

// ---- IPC: voice synthesis (edge-tts) ----
ipcMain.handle('voice:synth', async (_e, { voice: v, text, speed } = {}) => {
  try {
    const buf = await voice.synth(v, String(text || ''), speed || 1)
    if (!buf || !buf.length) return { ok: false, error: 'no audio produced' }
    return { ok: true, b64: buf.toString('base64') }
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) }
  }
})

// ---- IPC: Claude Code connection ----
ipcMain.handle('claude:status', () => claude.status())
ipcMain.handle('claude:connect', () => {
  try {
    const r = claude.connect(store.filePath(), claude.PORT)
    ensureVoiceServer()
    return r
  } catch (e) { return { ok: false, error: String((e && e.message) || e) } }
})
ipcMain.handle('claude:disconnect', () => {
  try { return claude.disconnect() } catch (e) { return { ok: false, error: String((e && e.message) || e) } }
})

// ---- IPC: start at login ----
ipcMain.handle('app:setAutostart', (_e, enabled) => {
  try { app.setLoginItemSettings({ openAtLogin: !!enabled }); return { ok: true } } catch (e) { return { ok: false } }
})

// ---- IPC: window controls ----
ipcMain.on('win:minimize', () => win && win.minimize())
ipcMain.on('win:hideToTray', () => win && win.hide())
ipcMain.on('win:close', () => win && win.hide())
ipcMain.on('app:quit', () => { quitting = true; app.quit() })

// ---- IPC: export / import one persona card ----
ipcMain.handle('persona:export', async (_e, card) => {
  const res = await dialog.showSaveDialog(win, {
    title: 'Export personality',
    defaultPath: `${(card && card.name) || 'character'}.anima`,
    filters: [{ name: 'Anima character', extensions: ['anima'] }],
  })
  if (res.canceled || !res.filePath) return { ok: false }
  try {
    fs.writeFileSync(res.filePath, JSON.stringify(card, null, 2), 'utf8')
    return { ok: true, path: res.filePath }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
})

ipcMain.handle('persona:import', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Import personality',
    properties: ['openFile'],
    filters: [{ name: 'Anima character', extensions: ['anima', 'json'] }],
  })
  if (res.canceled || !res.filePaths || !res.filePaths[0]) return { ok: false }
  try {
    const card = JSON.parse(fs.readFileSync(res.filePaths[0], 'utf8'))
    if (!card || typeof card !== 'object' || !card.name) return { ok: false, error: 'Not a valid character file' }
    return { ok: true, card }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  // If already connected to Claude, bring the voice server up so the Stop hook can speak.
  try { if (claude.status().connected) ensureVoiceServer() } catch (e) {}
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

// Keep running in the tray when all windows are closed.
app.on('window-all-closed', () => { /* stay alive in tray */ })
app.on('before-quit', () => { quitting = true })
