// Phase 3 mechanism test — runs against a THROWAWAY .claude dir, never the real one.
// Verifies: backup, hook merge preserves other hooks, rocky detection, idempotency,
// disconnect, the chat hook output, and the stop hook extraction + POST.
const fs = require('fs')
const path = require('path')
const os = require('os')
const http = require('http')
const net = require('net')
const { execFileSync } = require('child_process')

// Ask the OS for a free port instead of grabbing the production default (8124).
// The running Anima app owns 8124, so a fixed port makes this test crash when
// the app is open. An ephemeral port keeps the test independent of what's live.
function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.on('error', reject)
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) })
  })
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anima-test-'))
const claudeDir = path.join(tmp, '.claude')
fs.mkdirSync(claudeDir, { recursive: true })

let fails = 0
function check(name, cond) { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + name); if (!cond) fails++ }

// pre-existing settings with OTHER hooks (simulate an existing Rocky + voice-notify setup)
const existing = {
  permissions: { allow: ['Bash(ls *)'] },
  hooks: {
    SessionStart: [{ hooks: [{ type: 'command', command: 'node ~/.claude/hooks/rocky-activate.js' }] }],
    UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'node ~/.claude/hooks/rocky-tracker.js' }] }],
    Stop: [{ hooks: [{ type: 'command', command: 'python ~/.claude/hooks/voice-notify-stop.py' }] }],
  },
}
fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify(existing, null, 2))

process.env.ANIMA_CLAUDE_DIR = claudeDir
delete require.cache[require.resolve('../electron/claude.cjs')]
const claude = require('../electron/claude.cjs')

// fake anima data file
const dataPath = path.join(tmp, 'anima-data.json')
const data = {
  state: { theme: 'dark', master: true, activeId: 'mali', autostart: true, connected: false },
  cards: [
    { id: 'mali', name: 'Mali', glyph: '🌿', desc: 'calm', chat: true, voice: true, talk: 'Speak calmly in Thai.', voice_name: 'pim-th', speed: 1.0, reads: 'last' },
  ],
}
fs.writeFileSync(dataPath, JSON.stringify(data))

;(async () => {
const PORT = await freePort()

// --- connect ---
const r = claude.connect(dataPath, PORT)
const after = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'))
check('connect ok', r.ok)
check('backup created', r.backupPath && fs.existsSync(r.backupPath))
check('rocky detected (2 events)', r.rockyEvents.length === 2)
check('existing rocky SessionStart preserved', after.hooks.SessionStart.some((e) => e.hooks.some((h) => h.command.includes('rocky-activate'))))
check('existing voice-notify Stop preserved', after.hooks.Stop.some((e) => e.hooks.some((h) => h.command.includes('voice-notify-stop'))))
check('anima chat added to SessionStart', after.hooks.SessionStart.some((e) => e.hooks.some((h) => h.command.includes('anima-chat.cjs'))))
check('anima chat added to UserPromptSubmit', after.hooks.UserPromptSubmit.some((e) => e.hooks.some((h) => h.command.includes('anima-chat.cjs'))))
check('anima stop added to Stop', after.hooks.Stop.some((e) => e.hooks.some((h) => h.command.includes('anima-stop.cjs'))))
check('other permissions untouched', after.permissions && after.permissions.allow[0] === 'Bash(ls *)')
check('hook scripts copied', fs.existsSync(path.join(claudeDir, 'anima', 'anima-chat.cjs')) && fs.existsSync(path.join(claudeDir, 'anima', 'anima-stop.cjs')))
check('hook-config written', fs.existsSync(path.join(claudeDir, 'anima', 'hook-config.json')))

// --- idempotency: connect again, anima entries should not duplicate ---
claude.connect(dataPath, PORT)
const after2 = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'))
const animaSessionCount = after2.hooks.SessionStart.filter((e) => e.hooks.some((h) => h.command.includes('anima-chat.cjs'))).length
check('idempotent (no duplicate anima entry)', animaSessionCount === 1)
check('rocky still there after re-connect', after2.hooks.SessionStart.some((e) => e.hooks.some((h) => h.command.includes('rocky-activate'))))

// --- chat hook output (SessionStart) ---
const chatScript = path.join(claudeDir, 'anima', 'anima-chat.cjs')
const ssOut = execFileSync('node', [chatScript], { input: JSON.stringify({ hook_event_name: 'SessionStart' }) }).toString()
check('chat hook emits persona style (SessionStart)', ssOut.includes('Mali') && ssOut.includes('Speak calmly in Thai'))
const upOut = execFileSync('node', [chatScript], { input: JSON.stringify({ hook_event_name: 'UserPromptSubmit' }) }).toString()
let upJson = null; try { upJson = JSON.parse(upOut) } catch (e) {}
check('chat hook emits JSON for UserPromptSubmit', upJson && upJson.hookSpecificOutput && upJson.hookSpecificOutput.additionalContext.includes('Mali'))

// --- chat hook respects master off ---
const dataOff = JSON.parse(JSON.stringify(data)); dataOff.state.master = false
fs.writeFileSync(dataPath, JSON.stringify(dataOff))
const offOut = execFileSync('node', [chatScript], { input: JSON.stringify({ hook_event_name: 'SessionStart' }) }).toString()
check('chat hook silent when master off', offOut.trim() === '')
fs.writeFileSync(dataPath, JSON.stringify(data)) // restore

// --- stop hook extraction + POST ---
let received = null
const server = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { received = JSON.parse(b) } catch (e) {} res.writeHead(202); res.end('{}') })
})
server.listen(PORT, '127.0.0.1', () => {
  // write a fake transcript with an assistant message
  const transcript = path.join(tmp, 't.jsonl')
  fs.writeFileSync(transcript, JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'All done.\nThe build passed and the app is ready to test.' }] } }) + '\n')
  const stopScript = path.join(claudeDir, 'anima', 'anima-stop.cjs')
  execFileSync('node', [stopScript], { input: JSON.stringify({ transcript_path: transcript, session_id: 'x' }) })
  setTimeout(() => {
    check('stop hook POSTed text', received && typeof received.text === 'string' && received.text.length > 0)
    check('stop hook sent the last line', received && /ready to test/i.test(received.text))
    check('stop hook sent the active voice', received && received.voice === 'pim-th')
    server.close()
    // --- disconnect ---
    const dr = claude.disconnect()
    const afterDis = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'))
    check('disconnect removed anima entries', !JSON.stringify(afterDis.hooks).includes('anima-chat.cjs') && !JSON.stringify(afterDis.hooks).includes('anima-stop.cjs'))
    check('disconnect kept rocky', JSON.stringify(afterDis.hooks).includes('rocky-activate'))
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) {}
    console.log(fails === 0 ? '\nALL PHASE3 TESTS PASS' : `\n${fails} TEST(S) FAILED`)
    process.exit(fails === 0 ? 0 : 1)
  }, 600)
})
})().catch((e) => { console.error(e); process.exit(1) })
