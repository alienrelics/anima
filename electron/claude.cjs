// Anima <-> Claude Code wiring. Backs up settings.json, installs Anima's hook
// scripts, and merges Anima's hook entries WITHOUT disturbing any existing
// hooks. Reversible: a timestamped backup is written before any change, and
// disconnect removes only Anima's own entries.
const fs = require('fs')
const path = require('path')
const os = require('os')

const PORT = 8124
// ANIMA_CLAUDE_DIR lets tests point at a throwaway .claude dir instead of the real one.
const CLAUDE_DIR = process.env.ANIMA_CLAUDE_DIR || path.join(os.homedir(), '.claude')
const SETTINGS = path.join(CLAUDE_DIR, 'settings.json')
const ANIMA_DIR = path.join(CLAUDE_DIR, 'anima')
const HOOK_CHAT = path.join(ANIMA_DIR, 'anima-chat.cjs')
const HOOK_STOP = path.join(ANIMA_DIR, 'anima-stop.cjs')
const HOOK_CONFIG = path.join(ANIMA_DIR, 'hook-config.json')
// source hook scripts shipped with the app
const SRC_HOOKS = path.join(__dirname, 'hooks')

function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { return null } }
function isAnimaCmd(cmd) { return typeof cmd === 'string' && (cmd.includes('anima-chat.cjs') || cmd.includes('anima-stop.cjs')) }
function isRockyCmd(cmd) { return typeof cmd === 'string' && (cmd.includes('rocky-activate') || cmd.includes('rocky-tracker')) }

function entryHasCmd(entry, pred) {
  return entry && Array.isArray(entry.hooks) && entry.hooks.some((h) => pred(h && h.command))
}

// Scan settings for hook entries matching a predicate, across all events.
function findHooks(settings, pred) {
  const found = []
  const hooks = (settings && settings.hooks) || {}
  for (const ev of Object.keys(hooks)) {
    const arr = hooks[ev]
    if (!Array.isArray(arr)) continue
    arr.forEach((entry) => { if (entryHasCmd(entry, pred)) found.push(ev) })
  }
  return found
}

function status() {
  const settings = readJSON(SETTINGS)
  return {
    settingsExists: !!settings || fs.existsSync(SETTINGS),
    connected: !!settings && findHooks(settings, isAnimaCmd).length > 0,
    rockyEvents: settings ? findHooks(settings, isRockyCmd) : [],
  }
}

function backup() {
  if (!fs.existsSync(SETTINGS)) return null
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = path.join(CLAUDE_DIR, `settings.json.anima-backup-${stamp}`)
  fs.copyFileSync(SETTINGS, dest)
  return dest
}

function installHookScripts(dataPath, port) {
  fs.mkdirSync(ANIMA_DIR, { recursive: true })
  // read+write (not copyFile) so this works when the source lives inside a
  // packaged app.asar archive.
  fs.writeFileSync(HOOK_CHAT, fs.readFileSync(path.join(SRC_HOOKS, 'anima-chat.cjs')))
  fs.writeFileSync(HOOK_STOP, fs.readFileSync(path.join(SRC_HOOKS, 'anima-stop.cjs')))
  fs.writeFileSync(HOOK_CONFIG, JSON.stringify({ dataPath, port }, null, 2), 'utf8')
}

// Remove Anima's own hook entries from every event (idempotent).
function stripAnima(settings) {
  const hooks = settings.hooks || {}
  for (const ev of Object.keys(hooks)) {
    if (!Array.isArray(hooks[ev])) continue
    hooks[ev] = hooks[ev].filter((entry) => !entryHasCmd(entry, isAnimaCmd))
    if (hooks[ev].length === 0) delete hooks[ev]
  }
  settings.hooks = hooks
}

function addEntry(settings, ev, script) {
  if (!settings.hooks) settings.hooks = {}
  if (!Array.isArray(settings.hooks[ev])) settings.hooks[ev] = []
  settings.hooks[ev].push({ hooks: [{ type: 'command', command: `node "${script}"` }] })
}

function connect(dataPath, port) {
  const backupPath = backup()
  installHookScripts(dataPath, port || PORT)
  let settings = readJSON(SETTINGS) || {}
  if (typeof settings !== 'object' || Array.isArray(settings)) settings = {}
  const rockyEvents = findHooks(settings, isRockyCmd)
  stripAnima(settings)
  addEntry(settings, 'SessionStart', HOOK_CHAT)
  addEntry(settings, 'UserPromptSubmit', HOOK_CHAT)
  addEntry(settings, 'Stop', HOOK_STOP)
  fs.mkdirSync(CLAUDE_DIR, { recursive: true })
  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2), 'utf8')
  return { ok: true, backupPath, rockyEvents }
}

function disconnect() {
  const settings = readJSON(SETTINGS)
  if (!settings) return { ok: true, removed: 0 }
  const before = findHooks(settings, isAnimaCmd).length
  stripAnima(settings)
  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2), 'utf8')
  return { ok: true, removed: before }
}

module.exports = { status, connect, disconnect, PORT, ANIMA_DIR }
