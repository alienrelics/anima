// Anima stop hook — when a Claude reply finishes, speak part of it out loud
// in the active personality's voice. Reads what-to-speak from the persona's
// `reads` setting (last line / "What I need from you" / off), then POSTs the
// text to Anima's local voice server. Plain Node. Always exits 0, fail-silent.
const fs = require('fs')
const path = require('path')
const http = require('http')

function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { return null } }

const MAX = 220

function condense(s, limit) {
  s = s || ''
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // [text](url) -> text
  s = s.replace(/[*`_#>]+/g, '')                     // markdown marks
  s = s.replace(/\([^)]*\)/g, '')                    // (asides)
  s = s.replace(/\s+([.?!,;:])/g, '$1')
  s = s.replace(/\s+/g, ' ').trim()
  if (s.length > limit) s = s.slice(0, limit).replace(/\s+\S*$/, '')
  return s.trim()
}

function lastAssistantText(transcriptPath) {
  let last = null
  try {
    const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n')
    for (const line of lines) {
      const t = line.trim(); if (!t) continue
      let obj; try { obj = JSON.parse(t) } catch (e) { continue }
      const msg = obj && obj.message
      const role = (obj && obj.type) || (msg && msg.role)
      if (role !== 'assistant') continue
      const content = (msg && msg.content) != null ? msg.content : obj.content
      let text = ''
      if (typeof content === 'string') text = content
      else if (Array.isArray(content)) text = content.filter((b) => b && b.type === 'text').map((b) => b.text || '').join('\n')
      if (text.trim()) last = text
    }
  } catch (e) {}
  return last
}

function pickLastLine(text) {
  if (!text) return ''
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  // skip trailing markdown headers / our own section labels
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].replace(/^[-*•\s]+/, '')
    if (/^what i('| ha)/i.test(l)) continue
    const c = condense(l, MAX)
    if (c) return c
  }
  return ''
}

function pickNeed(text) {
  if (!text) return ''
  const m = text.match(/what i need from you\s*:?\s*\**/i)
  if (!m) return ''
  const after = text.slice(m.index + m[0].length)
  const bullets = []
  for (const raw of after.split('\n')) {
    const s = raw.trim()
    if (!s) { if (bullets.length) break; else continue }
    if (s.startsWith('**') || /^what i/i.test(s)) break
    const b = s.replace(/^[-*•\s]+/, '').trim()
    if (b) bullets.push(b)
  }
  if (!bullets.length || /^nothing\b/i.test(bullets[0])) return ''
  return condense(bullets[0], MAX)
}

// POST and resolve only once the request actually completes (or errors/times out),
// so the hook process does not exit before the message is delivered.
function say(port, payload) {
  return new Promise((resolve) => {
    const body = Buffer.from(JSON.stringify(payload))
    const req = http.request({ host: '127.0.0.1', port, path: '/say', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }, timeout: 2500 },
      (res) => { res.resume(); res.on('end', resolve); res.on('close', resolve) })
    req.on('error', () => resolve()); req.on('timeout', () => { req.destroy(); resolve() })
    req.write(body); req.end()
  })
}

let input = ''
process.stdin.on('data', (c) => { input += c })
process.stdin.on('end', async () => {
  let hook = {}
  try { hook = JSON.parse(input || '{}') } catch (e) {}
  try {
    if (hook.stop_hook_active) return process.exit(0)
    const cfg = readJSON(path.join(__dirname, 'hook-config.json')) || {}
    const data = cfg.dataPath ? readJSON(cfg.dataPath) : null
    if (!data || !data.state || !data.state.master) return process.exit(0)
    const active = (data.cards || []).find((c) => c.id === data.state.activeId)
    if (!active || !active.voice || active.reads === 'off') return process.exit(0)
    if (!hook.transcript_path) return process.exit(0)

    const text = lastAssistantText(hook.transcript_path)
    const spoken = active.reads === 'need' ? pickNeed(text) : pickLastLine(text)
    if (!spoken) return process.exit(0)
    await say(cfg.port || 8124, { text: spoken, voice: active.voice_name, speed: active.speed })
  } catch (e) {}
  process.exit(0)
})
