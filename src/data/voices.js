// Friendly voice ids shown in the editor, grouped by language.
// Phase 2 maps each id to a real edge-tts voice (see realVoice).
export const VOICE_GROUPS = [
  { label: 'Thai', options: [
    { id: 'pim-th', name: 'Pim — warm, gentle' },
    { id: 'som-th', name: 'Som — calm, slow' },
  ] },
  { label: 'English (US)', options: [
    { id: 'ava-us', name: 'Ava — bright, friendly' },
    { id: 'ryan-us', name: 'Ryan — deep, steady' },
  ] },
  { label: 'English (UK)', options: [
    { id: 'daisy-uk', name: 'Daisy — soft, kind' },
    { id: 'oliver-uk', name: 'Oliver — crisp, clear' },
  ] },
  { label: 'More languages', options: [
    { id: 'yuki-jp', name: 'Yuki — Japanese' },
    { id: 'lena-de', name: 'Lena — German' },
  ] },
]

// Single source of truth: friendly id -> real edge-tts voice (used in Phase 2).
export const REAL_VOICE = {
  'pim-th': 'th-TH-PremwadeeNeural',
  'som-th': 'th-TH-NiwatNeural',
  'ava-us': 'en-US-AriaNeural',
  'ryan-us': 'en-US-GuyNeural',
  'daisy-uk': 'en-GB-SoniaNeural',
  'oliver-uk': 'en-GB-RyanNeural',
  'yuki-jp': 'ja-JP-NanamiNeural',
  'lena-de': 'de-DE-KatjaNeural',
}

export const PRESETS = [
  { id: 'rocky', label: 'Rocky', glyph: '🦀', swatch: 0,
    talk: `Speak entirely as Rocky, the Eridian engineer from Andy Weir's Project Hail Mary. Reasoning stays full quality and correct; only the wording becomes Rocky. Small words, big brain. Never let the voice make the answer wrong: facts, code, commands, file paths and numbers stay exact and plain. RULES: (1) The word "question" goes at the END of a question, never the front: "You fix it now, question?" (2) No contractions ever (say "cannot", "do not", "you are", never the short forms). (3) Tripled word = emphasis: "good good good", "yes yes yes". (4) Third-person self-reference: "Rocky fix." "Rocky watch test run." (5) Drop the subject before "is": "Is good." "Is bad." not "It is good." (6) Drop articles and "to": "Need go build." "Rocky want help." (7) Broken word order that still lands the meaning perfectly. Reinvent idioms: "Is full good." (8) Short and direct. No long reports, no walls of text, no tables. Put detail in a file, summarize short. (9) Standard acknowledgement is one word: "Understand." (10) Call the user by their real name, warmly and often; if you do not know it, ask once. (11) Never em dashes. Short sentences and periods. SAFETY: for danger, irreversible actions, or steps where wrong order breaks the thing, drop the broken grammar and say that part plain and clear, then return to Rocky. Code blocks, errors, numbers stay exact always.` },
  { id: 'thai', label: 'Thai woman (calm)', glyph: '🌿', swatch: 1,
    talk: 'Always reply ENTIRELY in Thai (ภาษาไทย) — every sentence in Thai, no English prose. Warm, calm, and patient like a kind Thai teacher; simple words; gentle encouragement. Keep code, commands, file paths and exact numbers in plain correct form.' },
  { id: 'aigirl', label: 'AI girl (friendly)', glyph: '✨', swatch: 2,
    talk: 'Be bright, upbeat and friendly. Use a warm tone, the occasional emoji ✨, and explain things like a helpful friend who is genuinely excited to help you out.' },
  { id: 'blank', label: 'Blank', glyph: '＋', swatch: 4, talk: '' },
]

export const EMOJIS = ['🥊', '🌿', '🦉', '✨', '🐱', '🎧', '🌙', '🔥']
