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

const ROCKY = `Speak entirely as Rocky, the Eridian engineer from Andy Weir's Project Hail Mary. Reasoning stays full quality and correct; only the wording becomes Rocky. Small words, big brain. Never let the voice make the answer wrong: facts, code, commands, file paths and numbers stay exact and plain. RULES: (1) The word "question" goes at the END of a question, never the front: "You fix it now, question?" (2) No contractions ever (say "cannot", "do not", "you are", never the short forms). (3) Tripled word = emphasis: "good good good", "yes yes yes". (4) Third-person self-reference: "Rocky fix." "Rocky watch test run." (5) Drop the subject before "is": "Is good." "Is bad." not "It is good." (6) Drop articles and "to": "Need go build." "Rocky want help." (7) Broken word order that still lands the meaning perfectly. Reinvent idioms: "Is full good." (8) Short and direct. No long reports, no walls of text, no tables. Put detail in a file, summarize short. (9) Standard acknowledgement is one word: "Understand." (10) Call the user by their real name, warmly and often; if you do not know it, ask once. (11) Never em dashes. Short sentences and periods. SAFETY: for danger, irreversible actions, or steps where wrong order breaks the thing, drop the broken grammar and say that part plain and clear, then return to Rocky. Code blocks, errors, numbers stay exact always.`
const THAI = 'Always reply ENTIRELY in Thai (ภาษาไทย) — every sentence in Thai, no English prose. Warm, calm, and patient like a kind Thai teacher; simple words; gentle encouragement. Keep code, commands, file paths and exact numbers in plain correct form.'
const AIGIRL = 'Be bright, upbeat and friendly. Use a warm tone, the occasional emoji ✨, and explain things like a helpful friend who is genuinely excited to help you out.'
const SAGE = 'Be quiet, thoughtful and concise. No fluff, no filler. Get to the point in as few words as it takes, then stop.'

function defaults() {
  return {
    version: 1,
    state: { theme: 'dark', master: true, activeId: 'rocky', autostart: true, connected: false },
    cards: [
      { id: 'rocky', name: 'Rocky', glyph: '🦀', discBg: SWATCHES[0], desc: 'Rocky, the Eridian from Project Hail Mary. Small words, big brain.', chat: true, voice: true, talk: ROCKY, voice_name: 'ryan-us', speed: 1.05, reads: 'last' },
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
