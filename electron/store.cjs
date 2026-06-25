// Anima data store — owns the persona cards + global UI state on disk.
// Phase 1: a single JSON file in Electron's userData folder. Phase 3's Claude
// hooks read this same file to know the active persona.
const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const SWATCHES = [
  'linear-gradient(135deg,#FF9A62,#FF6F4D)',
  'linear-gradient(135deg,#7FD6A6,#4FB286)',
  'linear-gradient(135deg,#8B7BF7,#E86CA9)',
  'linear-gradient(135deg,#9AA0C7,#6F75A0)',
  'linear-gradient(135deg,#62C6FF,#4D8DFF)',
  'linear-gradient(135deg,#FFD56B,#FF9E3D)',
]

const ROCKY = 'Talk like a tough but caring boxing coach. Short, punchy sentences. Push me hard, celebrate small wins, and never let me make excuses.'
const THAI = 'Always reply ENTIRELY in Thai (ภาษาไทย) — every sentence in Thai, no English prose. Warm, calm, and patient like a kind Thai teacher; simple words; gentle encouragement. Keep code, commands, file paths and exact numbers in plain correct form.'
const AIGIRL = 'Be bright, upbeat and friendly. Use a warm tone, the occasional emoji ✨, and explain things like a helpful friend who is genuinely excited to help you out.'
const SAGE = 'Be quiet, thoughtful and concise. No fluff, no filler. Get to the point in as few words as it takes, then stop.'

function defaults() {
  return {
    version: 1,
    state: { theme: 'dark', master: true, activeId: 'rocky', autostart: true, connected: false },
    cards: [
      { id: 'rocky', name: 'Rocky', glyph: '🦀', discBg: SWATCHES[0], desc: 'Tough-love coach. No excuses, no quitting.', chat: true, voice: true, talk: ROCKY, voice_name: 'ryan-us', speed: 1.05, reads: 'last' },
      { id: 'mali', name: 'Mali', glyph: '🌿', discBg: SWATCHES[1], desc: 'Calm, gentle guidance — speaks Thai.', chat: true, voice: false, talk: THAI, voice_name: 'pim-th', speed: 0.95, reads: 'last' },
      { id: 'nova', name: 'Nova', glyph: 'N', discBg: SWATCHES[2], desc: 'Bright and upbeat. Loves a good emoji.', chat: false, voice: true, talk: AIGIRL, voice_name: 'ava-us', speed: 1.1, reads: 'last' },
      { id: 'sage', name: 'Sage', glyph: '🦉', discBg: SWATCHES[3], desc: 'Quiet and thoughtful. Gets to the point.', chat: false, voice: false, talk: SAGE, voice_name: 'oliver-uk', speed: 1.0, reads: 'off' },
    ],
  }
}

function filePath() {
  return path.join(app.getPath('userData'), 'anima-data.json')
}

function load() {
  try {
    const raw = fs.readFileSync(filePath(), 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && parsed.cards && parsed.state) return parsed
  } catch (e) { /* first run / corrupt -> defaults */ }
  const d = defaults()
  save(d)
  return d
}

function save(data) {
  try {
    const tmp = filePath() + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
    fs.renameSync(tmp, filePath())
    return true
  } catch (e) {
    return false
  }
}

module.exports = { load, save, defaults, filePath, SWATCHES }
