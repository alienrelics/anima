// Anima voice engine — synthesizes speech with edge-tts (free, no key) via msedge-tts.
// Friendly voice ids (shown in the editor) map to real edge-tts voices here.
// This module is the single source of truth for that mapping on the main side.
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts')

const REAL_VOICE = {
  'pim-th': 'th-TH-PremwadeeNeural',
  'som-th': 'th-TH-NiwatNeural',
  'ava-us': 'en-US-AriaNeural',
  'ryan-us': 'en-US-GuyNeural',
  'daisy-uk': 'en-GB-SoniaNeural',
  'oliver-uk': 'en-GB-RyanNeural',
  'yuki-jp': 'ja-JP-NanamiNeural',
  'lena-de': 'de-DE-KatjaNeural',
}

function rateStr(speed) {
  const pct = Math.round(((Number(speed) || 1) - 1) * 100)
  return (pct >= 0 ? '+' : '') + pct + '%'
}

function synthOnce(voice, text, rate) {
  return new Promise((resolve, reject) => {
    const tts = new MsEdgeTTS()
    tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3).then(() => {
      const { audioStream } = tts.toStream(text, { rate })
      const chunks = []
      audioStream.on('data', (c) => chunks.push(c))
      audioStream.on('error', (e) => { try { tts.close() } catch (x) {} reject(e) })
      audioStream.on('end', () => { try { tts.close() } catch (x) {} resolve(Buffer.concat(chunks)) })
    }).catch(reject)
  })
}

// Returns an mp3 Buffer for the given text. edge-tts (free) intermittently
// returns an empty stream with no error, so retry a few times until we get
// real audio. The first call after launch is the most likely to come back cold.
async function synth(friendlyId, text, speed) {
  const voice = REAL_VOICE[friendlyId] || 'en-US-AriaNeural'
  const rate = rateStr(speed)
  let last = Buffer.alloc(0)
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const buf = await synthOnce(voice, text, rate)
      if (buf && buf.length > 0) return buf
      last = buf
    } catch (e) { /* transient — retry */ }
    await new Promise((r) => setTimeout(r, 200 * (attempt + 1)))
  }
  return last
}

module.exports = { synth, REAL_VOICE }
