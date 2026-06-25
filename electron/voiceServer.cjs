// Anima local voice server. The Claude Stop hook POSTs text here; Anima
// synthesizes it with edge-tts and hands the audio to the renderer to play.
// Bound to 127.0.0.1 only — never leaves the machine (besides edge-tts synth).
const http = require('http')
const voice = require('./voice.cjs')

let server = null
let currentPort = null

function start(port, sendToRenderer) {
  if (server) return currentPort
  currentPort = port
  server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url.replace(/\/$/, '') === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ ok: true }))
    }
    if (req.method !== 'POST' || req.url.replace(/\/$/, '') !== '/say') {
      res.writeHead(404); return res.end()
    }
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', async () => {
      let data = {}
      try { data = JSON.parse(body || '{}') } catch (e) {}
      const text = (data.text || '').toString().trim()
      res.writeHead(202, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ queued: !!text }))
      if (!text) return
      try {
        const buf = await voice.synth(data.voice, text, data.speed || 1)
        if (buf && buf.length) sendToRenderer(buf.toString('base64'))
      } catch (e) { /* synth failed -> silent */ }
    })
  })
  server.on('error', () => { server = null; currentPort = null })
  server.listen(port, '127.0.0.1')
  return currentPort
}

function stop() {
  if (server) { try { server.close() } catch (e) {} server = null; currentPort = null }
}

module.exports = { start, stop }
