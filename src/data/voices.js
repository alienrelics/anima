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
  { id: 'rocky', label: 'Rocky', glyph: '🥊', swatch: 0,
    talk: 'Talk like a tough but caring boxing coach. Short, punchy sentences. Push me hard, celebrate small wins, and never let me make excuses.' },
  { id: 'thai', label: 'Thai woman (calm)', glyph: '🌿', swatch: 1,
    talk: 'Always reply ENTIRELY in Thai (ภาษาไทย) — every sentence in Thai, no English prose. Warm, calm, and patient like a kind Thai teacher; simple words; gentle encouragement. Keep code, commands, file paths and exact numbers in plain correct form.' },
  { id: 'aigirl', label: 'AI girl (friendly)', glyph: '✨', swatch: 2,
    talk: 'Be bright, upbeat and friendly. Use a warm tone, the occasional emoji ✨, and explain things like a helpful friend who is genuinely excited to help you out.' },
  { id: 'blank', label: 'Blank', glyph: '＋', swatch: 4, talk: '' },
]

export const EMOJIS = ['🥊', '🌿', '🦉', '✨', '🐱', '🎧', '🌙', '🔥']
