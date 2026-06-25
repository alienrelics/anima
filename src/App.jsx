import React, { useEffect, useState, useRef } from 'react'
import { themeVars, sw, SWATCHES } from './theme.js'
import { VOICE_GROUPS, PRESETS, EMOJIS } from './data/voices.js'
import logo from './assets/logo.png'

// ---- web-preview fallback (when not running inside Electron) ----
function buildDefaultData() {
  const p = Object.fromEntries(PRESETS.map((x) => [x.id, x.talk]))
  return {
    version: 1,
    state: { theme: 'dark', master: true, activeId: 'rocky', autostart: true, connected: false },
    cards: [
      { id: 'rocky', name: 'Rocky', glyph: '🦀', discBg: SWATCHES[0], desc: 'Tough-love coach. No excuses, no quitting.', chat: true, voice: true, talk: p.rocky, voice_name: 'ryan-us', speed: 1.05, reads: 'last' },
      { id: 'mali', name: 'Mali', glyph: '🌿', discBg: SWATCHES[1], desc: 'Calm, gentle guidance — speaks Thai.', chat: true, voice: false, talk: p.thai, voice_name: 'pim-th', speed: 0.95, reads: 'last' },
      { id: 'nova', name: 'Nova', glyph: 'N', discBg: SWATCHES[2], desc: 'Bright and upbeat. Loves a good emoji.', chat: false, voice: true, talk: p.aigirl, voice_name: 'ava-us', speed: 1.1, reads: 'last' },
      { id: 'sage', name: 'Sage', glyph: '🦉', discBg: SWATCHES[3], desc: 'Quiet and thoughtful. Gets to the point.', chat: false, voice: false, talk: 'Be quiet, thoughtful and concise. No fluff, no filler.', voice_name: 'oliver-uk', speed: 1.0, reads: 'off' },
    ],
  }
}
const API = (typeof window !== 'undefined' && window.anima) ? window.anima : {
  load: async () => { try { return JSON.parse(localStorage.getItem('anima') || '') } catch (e) { return buildDefaultData() } },
  save: async (d) => { localStorage.setItem('anima', JSON.stringify(d)); return true },
  synth: async () => ({ ok: false }),
  claudeStatus: async () => ({ connected: false, settingsExists: false, rockyEvents: [] }),
  claudeConnect: async () => ({ ok: false, error: 'Only works in the app' }),
  claudeDisconnect: async () => ({ ok: true }),
  setAutostart: async () => ({ ok: true }),
  onPlay: () => () => {},
  exportPersona: async () => ({ ok: true }),
  importPersona: async () => ({ ok: false }),
  minimize: () => {}, hideToTray: () => {}, close: () => {}, quit: () => {},
  onExternalChange: () => () => {},
}

// Sample line for the Test button, in the voice's own language.
function sampleLine(voiceId) {
  if (/-th$/.test(voiceId)) return 'สวัสดีค่ะ วันนี้มีอะไรให้ช่วยไหมคะ'
  if (/-jp$/.test(voiceId)) return 'こんにちは。お手伝いできてうれしいです。'
  if (/-de$/.test(voiceId)) return 'Hallo! Schön, dass du da bist. Lass uns anfangen.'
  return "Hi! I'm so glad you're here. Let's get this done together."
}

const speedTxt = (v) => (v < 0.85 ? 'Slower' : v > 1.2 ? 'Faster' : 'Normal')
const READS = [
  { id: 'last', label: 'The last line of the reply' },
  { id: 'need', label: 'The “What I need from you” line' },
  { id: 'off', label: 'Nothing — stay silent' },
]

export default function App() {
  const [data, setData] = useState(null)
  const [screen, setScreen] = useState('deck')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState('new')
  const [draft, setDraft] = useState(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [toast, setToast] = useState('')
  const [connected, setConnected] = useState(false)
  const toastTimer = useRef(null)
  const playAudio = useRef(null)
  const testAudio = useRef(null)

  useEffect(() => {
    API.load().then((d) => setData(d || buildDefaultData()))
    API.claudeStatus().then((st) => setConnected(!!(st && st.connected)))
    const off = API.onExternalChange(() => API.load().then((d) => d && setData(d)))
    // Play audio pushed from the voice server (Stop hook -> spoken reply).
    const offPlay = API.onPlay((b64) => {
      try {
        if (playAudio.current) { try { playAudio.current.pause() } catch (e) {} }
        const a = new Audio('data:audio/mpeg;base64,' + b64)
        playAudio.current = a
        a.play().catch(() => {})
      } catch (e) {}
    })
    return () => { try { off && off() } catch (e) {} try { offPlay && offPlay() } catch (e) {} }
  }, [])

  if (!data) return null
  const s = data.state
  const cards = data.cards

  // persist helper
  function commit(next) { setData(next); API.save(next) }
  function patchState(p) { commit({ ...data, state: { ...data.state, ...p } }) }
  function patchCards(fn) { commit({ ...data, cards: fn(data.cards) }) }

  function flash(msg) {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  const setD = (p) => setDraft((dr) => ({ ...dr, ...p }))

  function openNew() {
    setDraft({ id: 'new-' + Date.now(), name: '', glyph: '✨', discBg: SWATCHES[2], desc: '', chat: true, voice: true, talk: '', voice_name: 'ava-us', speed: 1.0, reads: 'last', _isNew: true })
    setEditorMode('new'); setEditorOpen(true)
  }
  function openEdit(c) { setDraft({ ...c }); setEditorMode('edit'); setEditorOpen(true) }
  function closeEditor() { try { speechSynthesis.cancel() } catch (e) {} setSpeaking(false); setEditorOpen(false) }

  function saveEditor() {
    const dd = { ...draft }
    delete dd._isNew; delete dd._preset
    if (!dd.name) dd.name = 'Untitled'
    if (!dd.desc) dd.desc = dd.talk ? dd.talk.slice(0, 46) + (dd.talk.length > 46 ? '…' : '') : 'A new character.'
    const exists = cards.some((c) => c.id === dd.id)
    patchCards((cs) => (exists ? cs.map((c) => (c.id === dd.id ? dd : c)) : [...cs, dd]))
    setEditorOpen(false)
    flash(editorMode === 'new' ? 'Character created' : 'Saved')
  }
  function deleteCard() {
    const id = draft.id
    const next = { ...data, cards: cards.filter((c) => c.id !== id) }
    if (next.state.activeId === id) next.state = { ...next.state, activeId: next.cards[0] ? next.cards[0].id : '' }
    commit(next); setEditorOpen(false); flash('Character deleted')
  }
  async function exportCard() {
    const card = { ...draft }; delete card._isNew; delete card._preset
    const r = await API.exportPersona(card)
    if (r && r.ok) flash('Exported ' + (card.name || 'character') + '.anima')
  }
  async function importPersona() {
    const r = await API.importPersona()
    if (r && r.ok && r.card) {
      const card = { ...r.card, id: 'imp-' + Date.now() }
      patchCards((cs) => [...cs, card])
      flash('Imported ' + (card.name || 'character'))
    } else if (r && r.error) flash(r.error)
  }

  function webSpeechFallback(voiceId, speed) {
    try {
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(sampleLine(voiceId))
      u.rate = Math.max(0.5, Math.min(2, speed || 1.0)); u.pitch = 1.1
      u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false)
      speechSynthesis.speak(u)
    } catch (e) { setSpeaking(false) }
  }
  async function testVoice() {
    const voiceId = d.voice_name || 'ava-us'
    const speed = d.speed || 1.0
    // stop anything already playing
    if (testAudio.current) { try { testAudio.current.pause() } catch (e) {} testAudio.current = null }
    try { speechSynthesis.cancel() } catch (e) {}
    if (speaking) { setSpeaking(false); return }
    setSpeaking(true)
    try {
      const r = await API.synth({ voice: voiceId, text: sampleLine(voiceId), speed })
      if (r && r.ok && r.b64) {
        const audio = new Audio('data:audio/mpeg;base64,' + r.b64)
        testAudio.current = audio
        audio.onended = () => { setSpeaking(false); testAudio.current = null }
        audio.onerror = () => { setSpeaking(false); testAudio.current = null; webSpeechFallback(voiceId, speed) }
        await audio.play()
        return
      }
      throw new Error((r && r.error) || 'no audio')
    } catch (e) {
      // edge-tts unavailable (offline, etc.) -> browser voice as a safety net
      webSpeechFallback(voiceId, speed)
    }
  }

  const V = themeVars(s.theme)
  const accent = 'var(--accent,#7C6BF5)'
  const dim = 'var(--dim,#A7A2B5)'
  const surface = 'var(--surface,#211E2D)'
  const surface2 = 'var(--surface2,#2B2738)'
  const border = '1px solid var(--border,rgba(255,255,255,.09))'
  const border2 = 'var(--border2,rgba(255,255,255,.16))'
  const display = "'Bricolage Grotesque',sans-serif"
  const d = draft || {}

  const ms = sw(s.master, true)
  const as = sw(s.autostart, true)
  const dcs = sw(!!d.chat), dvs = sw(!!d.voice)

  const iconBtn = { width: 40, height: 40, background: surface, border, color: 'var(--text,#F4F2F8)', borderRadius: 12, cursor: 'pointer', fontSize: 16 }

  return (
    <div style={{ ...V, height: '100%' }}>
      <div style={{ height: '100%', width: '100%', background: 'var(--bg,#15131E)', color: 'var(--text,#F4F2F8)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* title bar */}
        <div style={{ height: 40, flex: '0 0 40px', background: 'var(--titlebar,#1B1925)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 14, borderBottom: border, userSelect: 'none', WebkitAppRegion: 'drag' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <img src={logo} alt="Anima" style={{ width: 18, height: 18, display: 'block' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: dim, letterSpacing: '.2px' }}>Anima</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', WebkitAppRegion: 'no-drag' }}>
            <div onClick={() => API.minimize()} title="Minimize" style={winBtn(dim)}>&#x2212;</div>
            <div onClick={() => API.hideToTray()} title="Hide to tray" style={winBtn(dim)}>&#x25A1;</div>
            <div onClick={() => API.close()} title="Close to tray" style={{ ...winBtn(dim), }} onMouseEnter={(e) => { e.currentTarget.style.background = '#E5484D'; e.currentTarget.style.color = '#fff' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = dim }}>&#x2715;</div>
          </div>
        </div>

        {/* content */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg,#15131E)' }}>

          {/* ===== DECK ===== */}
          {screen === 'deck' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', animation: 'anima-fade .25s ease' }}>
              <div style={{ flex: '0 0 auto', padding: '22px 30px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <img src={logo} alt="Anima" style={{ width: 42, height: 42, display: 'block', filter: 'drop-shadow(0 5px 14px rgba(124,107,245,.45))' }} />
                  <div>
                    <div style={{ fontFamily: display, fontWeight: 700, fontSize: 25, lineHeight: 1, letterSpacing: '-.4px' }}>Anima</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#36C77F', boxShadow: '0 0 0 3px rgba(54,199,127,.18)', animation: 'anima-pulse 2.4s ease infinite' }} />
                      <span style={{ fontSize: 12.5, color: dim, fontWeight: 500 }}>Voice engine running</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div onClick={() => patchState({ master: !s.master })} style={{ display: 'flex', alignItems: 'center', gap: 11, background: surface, border, padding: '8px 13px 8px 15px', borderRadius: 13, cursor: 'pointer' }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>Anima</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: s.master ? accent : dim }}>{s.master ? 'On' : 'Off'}</span>
                    <div style={ms.track}><div style={ms.knob} /></div>
                  </div>
                  <button onClick={importPersona} style={{ display: 'flex', alignItems: 'center', gap: 7, background: surface, border, color: 'var(--text,#F4F2F8)', padding: '10px 15px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>&#x2913; Import</button>
                  <button onClick={() => patchState({ theme: s.theme === 'dark' ? 'light' : 'dark' })} title="Toggle light / dark" style={iconBtn}>{s.theme === 'dark' ? '☀' : '☾'}</button>
                  <button onClick={() => setScreen('settings')} title="Settings" style={iconBtn}>&#9881;</button>
                </div>
              </div>

              <div style={{ padding: '0 30px 6px' }}><div style={{ fontSize: 13.5, color: dim }}>Pick a character to bring Claude to life. The active one writes and speaks for you.</div></div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 30px 30px', position: 'relative', opacity: s.master ? 1 : 0.4, transition: 'opacity .25s' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, maxWidth: 1140 }}>
                  {cards.map((c) => {
                    const isActive = c.id === s.activeId && s.master
                    const cs = sw(c.chat), vs = sw(c.voice)
                    const upper = c.glyph && c.glyph.length === 1 && /[A-Z]/.test(c.glyph)
                    return (
                      <div key={c.id} onClick={() => patchState({ activeId: c.id })} style={{ position: 'relative', background: surface, borderRadius: 20, padding: 20, cursor: 'pointer', transition: 'transform .18s,box-shadow .18s,border-color .18s', border: isActive ? `2px solid ${accent}` : border, boxShadow: isActive ? '0 0 0 4px var(--accentSoft,rgba(124,107,245,.18)),0 16px 36px rgba(124,107,245,.22)' : '0 4px 16px rgba(0,0,0,.07)', transform: isActive ? 'translateY(-3px)' : 'none' }}>
                        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 7, zIndex: 2 }}>
                          {isActive && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: accent, color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '4px 9px 4px 7px', borderRadius: 20, letterSpacing: '.3px', boxShadow: '0 3px 10px rgba(124,107,245,.5)' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />ACTIVE</div>
                          )}
                          <div onClick={(e) => { e.stopPropagation(); openEdit(c) }} title="Edit character" style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--surface2,#2B2738)', border, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12.5, color: dim }}>✎</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                          <div style={{ width: 52, height: 52, borderRadius: 16, background: c.discBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: upper ? 24 : 26, color: '#fff', fontWeight: 700, fontFamily: display, flex: '0 0 auto', boxShadow: '0 6px 16px rgba(0,0,0,.2)' }}>{c.glyph}</div>
                          <div style={{ paddingTop: 3, minWidth: 0, paddingRight: 30 }}>
                            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 20, letterSpacing: '-.3px', lineHeight: 1.1 }}>{c.name}</div>
                            <div style={{ fontSize: 12.8, color: dim, marginTop: 5, lineHeight: 1.45 }}>{c.desc}</div>
                          </div>
                        </div>
                        <div style={{ height: 1, background: 'var(--border,rgba(255,255,255,.09))', margin: '18px 0 14px' }} />
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div onClick={(e) => { e.stopPropagation(); patchCards((cs2) => cs2.map((x) => x.id === c.id ? { ...x, chat: !x.chat } : x)) }} style={togglePill(surface2)}>
                            <span style={pillLabel}>💬 Chat</span>
                            <div style={cs.track}><div style={cs.knob} /></div>
                          </div>
                          <div onClick={(e) => { e.stopPropagation(); patchCards((cs2) => cs2.map((x) => x.id === c.id ? { ...x, voice: !x.voice } : x)) }} style={togglePill(surface2)}>
                            <span style={pillLabel}>🔊 Voice</span>
                            <div style={vs.track}><div style={vs.knob} /></div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div onClick={openNew} style={{ border: `2px dashed ${border2}`, borderRadius: 20, minHeight: 172, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', color: dim }}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--accentSoft,rgba(124,107,245,.18))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: accent, fontWeight: 300 }}>+</div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>New personality</span>
                  </div>
                </div>

                {!s.master && (
                  <div style={{ position: 'absolute', inset: '16px 30px 30px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ background: surface, border: `1px solid ${border2}`, padding: '14px 22px', borderRadius: 14, fontWeight: 600, fontSize: 14, boxShadow: '0 12px 30px rgba(0,0,0,.25)' }}>Anima is off — flip the master switch to wake your characters.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== SETTINGS ===== */}
          {screen === 'settings' && (
            <div style={{ height: '100%', overflowY: 'auto', animation: 'anima-fade .25s ease' }}>
              <div style={{ maxWidth: 720, margin: '0 auto', padding: '26px 30px 50px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 26 }}>
                  <button onClick={() => setScreen('deck')} style={{ width: 38, height: 38, borderRadius: 11, background: surface, border, color: 'var(--text,#F4F2F8)', cursor: 'pointer', fontSize: 16 }}>&#8592;</button>
                  <div style={{ fontFamily: display, fontWeight: 700, fontSize: 24, letterSpacing: '-.4px' }}>Settings</div>
                </div>

                <div style={{ ...card(surface, border), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>Start Anima when my PC turns on</div>
                    <div style={{ fontSize: 12.8, color: dim, marginTop: 5 }}>Keeps your voice ready the moment you log in.</div>
                  </div>
                  <div onClick={() => { const v = !s.autostart; patchState({ autostart: v }); API.setAutostart(v) }} style={{ cursor: 'pointer', flex: '0 0 auto' }}><div style={as.track}><div style={as.knob} /></div></div>
                </div>

                <div style={{ ...card(surface, border), marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>Claude Code connection</div>
                      <div style={{ fontSize: 12.8, color: dim, marginTop: 5 }}>{connected ? 'Linked and ready. Your active character is in control.' : 'Not connected yet. Anima can write and speak once you link it.'}</div>
                    </div>
                    {connected ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(54,199,127,.14)', color: '#36C77F', padding: '8px 14px', borderRadius: 11, fontWeight: 600, fontSize: 13, flex: '0 0 auto' }}>✓ Linked</div>
                    ) : (
                      <button onClick={() => setConnectOpen(true)} style={{ background: accent, color: '#fff', border: 'none', padding: '11px 18px', borderRadius: 12, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', flex: '0 0 auto', boxShadow: '0 5px 16px rgba(124,107,245,.45)' }}>Connect to Claude Code</button>
                    )}
                  </div>
                </div>

                <div style={card(surface, border)}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Back up &amp; restore my setup</div>
                  <div style={{ fontSize: 12.8, color: dim, marginTop: 5, marginBottom: 16 }}>Save all your characters and settings to a file, or bring them back later.</div>
                  <div style={{ display: 'flex', gap: 11 }}>
                    <button onClick={() => flash('Backup arrives in a later step')} style={ghostBtn(surface2, border)}>&#x2913; Back up now</button>
                    <button onClick={() => flash('Restore arrives in a later step')} style={ghostBtn(surface2, border)}>&#x2191; Restore from file</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== CONNECT MODAL ===== */}
          {connectOpen && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,6,14,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, zIndex: 40, animation: 'anima-fade .18s ease' }}>
              <div style={{ width: 540, background: surface, border: `1px solid ${border2}`, borderRadius: 18, padding: 26, boxShadow: '0 30px 70px rgba(0,0,0,.5)', animation: 'anima-pop .25s cubic-bezier(.2,.8,.3,1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accentSoft,rgba(124,107,245,.18))', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔗</div>
                  <div style={{ fontFamily: display, fontWeight: 700, fontSize: 19 }}>Connect to Claude Code</div>
                </div>
                <div style={{ fontSize: 13.5, color: dim, lineHeight: 1.5, marginBottom: 18 }}>Here's exactly what Anima will change. Nothing happens until you press Confirm.</div>
                <div style={{ background: surface2, borderRadius: 13, padding: '6px 4px', marginBottom: 20 }}>
                  {[['+', 'Add a small helper to Claude Code\'s settings', 'So your active character\'s writing style is used automatically.', '#36C77F'],
                    ['+', 'Let Anima read replies out loud', 'Turns on the spoken voice for the parts you choose per character.', '#36C77F'],
                    ['✓', 'Your existing files stay untouched', 'We make a backup first, and you can undo this anytime.', dim]].map((r, i) => (
                    <div key={i}>
                      {i > 0 && <div style={{ height: 1, background: 'var(--border,rgba(255,255,255,.09))', margin: '0 14px' }} />}
                      <div style={{ display: 'flex', gap: 12, padding: '13px 14px', alignItems: 'flex-start' }}>
                        <span style={{ color: r[3], fontSize: 15, marginTop: 1 }}>{r[0]}</span>
                        <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{r[1]}</div><div style={{ fontSize: 12.3, color: dim, marginTop: 3 }}>{r[2]}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 11, justifyContent: 'flex-end' }}>
                  <button onClick={() => setConnectOpen(false)} style={{ background: 'transparent', border: `1px solid ${border2}`, color: 'var(--text,#F4F2F8)', padding: '11px 18px', borderRadius: 12, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={async () => {
                    const r = await API.claudeConnect()
                    if (r && r.ok) {
                      setConnected(true); setConnectOpen(false)
                      flash(r.backupPath ? 'Connected ✓  Settings backed up' : 'Connected to Claude Code ✓')
                    } else { flash((r && r.error) || 'Connect failed') }
                  }} style={{ background: accent, color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 12, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', boxShadow: '0 5px 16px rgba(124,107,245,.45)' }}>Confirm &amp; connect</button>
                </div>
              </div>
            </div>
          )}

          {/* ===== EDITOR SLIDE-OVER ===== */}
          {editorOpen && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
              <div onClick={closeEditor} style={{ position: 'absolute', inset: 0, background: 'rgba(8,6,14,.5)', backdropFilter: 'blur(3px)', animation: 'anima-fade .2s ease' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 560, background: surface, boxShadow: '-20px 0 60px rgba(0,0,0,.4)', display: 'flex', flexDirection: 'column', animation: 'anima-slide .3s cubic-bezier(.2,.8,.3,1)', borderLeft: `1px solid ${border2}` }}>
                <div style={{ flex: '0 0 auto', padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: border }}>
                  <div style={{ fontFamily: display, fontWeight: 700, fontSize: 20, letterSpacing: '-.3px' }}>{editorMode === 'new' ? 'New personality' : 'Edit ' + (d.name || 'personality')}</div>
                  <button onClick={closeEditor} style={{ width: 34, height: 34, borderRadius: 10, background: surface2, border: 'none', color: dim, cursor: 'pointer', fontSize: 14 }}>&#x2715;</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px 16px' }}>
                  {editorMode === 'new' && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={editorLabel(dim)}>Start from</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9 }}>
                        {PRESETS.map((p) => {
                          const sel = d._preset === p.id
                          return (
                            <div key={p.id} onClick={() => setD({ _preset: p.id, talk: p.talk, glyph: p.glyph, discBg: SWATCHES[p.swatch] })} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '13px 6px', borderRadius: 13, cursor: 'pointer', transition: 'all .15s', background: sel ? 'var(--accentSoft,rgba(124,107,245,.18))' : surface2, border: sel ? `1.5px solid ${accent}` : '1.5px solid transparent' }}>
                              <div style={{ fontSize: 22 }}>{p.glyph}</div>
                              <div style={{ fontSize: 11.5, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, marginTop: 6 }}>{p.label}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: 20 }}>
                    <label style={editorLabel(dim)}>Name</label>
                    <input value={d.name || ''} onChange={(e) => setD({ name: e.target.value })} placeholder="Give your character a name" style={{ width: '100%', background: surface2, border, borderRadius: 12, padding: '13px 14px', color: 'var(--text,#F4F2F8)', fontSize: 15, fontWeight: 600, outline: 'none' }} />
                  </div>

                  <div style={{ marginBottom: 22 }}>
                    <label style={editorLabel(dim)}>Avatar</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 17, background: d.discBg || SWATCHES[2], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', fontWeight: 700, fontFamily: display, flex: '0 0 auto', boxShadow: '0 6px 16px rgba(0,0,0,.2)' }}>{d.glyph || '✨'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
                          {EMOJIS.map((g) => (
                            <div key={g} onClick={() => setD({ glyph: g })} style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, cursor: 'pointer', background: d.glyph === g ? 'var(--accentSoft,rgba(124,107,245,.18))' : surface2, border: d.glyph === g ? `1.5px solid ${accent}` : '1.5px solid transparent' }}>{g}</div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                          {SWATCHES.map((c) => (
                            <div key={c} onClick={() => setD({ discBg: c })} style={{ width: 32, height: 32, borderRadius: 9, cursor: 'pointer', background: c, boxShadow: d.discBg === c ? `0 0 0 2px ${surface},0 0 0 4px ${accent}` : 'none' }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 22 }}>
                    <label style={editorLabel(dim)}>How it talks</label>
                    <textarea value={d.talk || ''} onChange={(e) => setD({ talk: e.target.value })} rows={5} style={{ width: '100%', background: surface2, border, borderRadius: 12, padding: '13px 14px', color: 'var(--text,#F4F2F8)', fontSize: 13.8, lineHeight: 1.55, outline: 'none', resize: 'none' }} />
                    <div style={{ fontSize: 12, color: dim, marginTop: 8, lineHeight: 1.45 }}>💡 Describe it like you'd describe a friend. "Cheerful, talks in short sentences, loves a pun." Claude will write in this style.</div>
                  </div>

                  <div style={{ background: surface2, borderRadius: 15, padding: 18, marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>🔊 Out-loud voice</div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: dim, display: 'block', marginBottom: 7 }}>Spoken voice</label>
                    <select value={d.voice_name || 'ava-us'} onChange={(e) => setD({ voice_name: e.target.value })} style={{ width: '100%', appearance: 'none', background: surface, border, borderRadius: 11, padding: '12px 38px 12px 13px', color: 'var(--text,#F4F2F8)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', outline: 'none', marginBottom: 16 }}>
                      {VOICE_GROUPS.map((g) => (
                        <optgroup key={g.label} label={g.label}>
                          {g.options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: dim }}>Speed</label>
                      <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{speedTxt(d.speed || 1.0)} · {(d.speed || 1.0).toFixed(2)}×</span>
                    </div>
                    <input type="range" min="0.6" max="1.6" step="0.05" value={d.speed || 1.0} onChange={(e) => setD({ speed: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#7C6BF5', marginBottom: 16, cursor: 'pointer' }} />
                    <button onClick={testVoice} style={{ width: '100%', background: accent, color: '#fff', border: 'none', padding: 12, borderRadius: 11, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 5px 14px rgba(124,107,245,.4)' }}>{speaking ? '■ Speaking…' : '▶ Test voice'}</button>
                  </div>

                  <div style={{ marginBottom: 22 }}>
                    <label style={editorLabel(dim)}>What the voice reads</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {READS.map((r) => {
                        const sel = d.reads === r.id
                        return (
                          <div key={r.id} onClick={() => setD({ reads: r.id })} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 12, cursor: 'pointer', transition: 'all .15s', background: sel ? 'var(--accentSoft,rgba(124,107,245,.14))' : surface2, border: sel ? `1.5px solid ${accent}` : '1.5px solid transparent' }}>
                            <div style={{ width: 18, height: 18, borderRadius: '50%', flex: '0 0 auto', border: sel ? `5px solid ${accent}` : `2px solid ${dim}`, transition: 'all .15s' }} />
                            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 11, marginBottom: 8 }}>
                    <div onClick={() => setD({ chat: !d.chat })} style={{ ...togglePill(surface2), padding: '13px 14px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600 }}>💬 Chat on by default</span>
                      <div style={dcs.track}><div style={dcs.knob} /></div>
                    </div>
                    <div onClick={() => setD({ voice: !d.voice })} style={{ ...togglePill(surface2), padding: '13px 14px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600 }}>🔊 Voice on by default</span>
                      <div style={dvs.track}><div style={dvs.knob} /></div>
                    </div>
                  </div>
                </div>

                <div style={{ flex: '0 0 auto', padding: '16px 24px', borderTop: border, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {editorMode === 'edit' && <button onClick={deleteCard} style={{ background: 'transparent', border: '1px solid rgba(229,72,77,.4)', color: '#E5484D', padding: '11px 15px', borderRadius: 11, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Delete</button>}
                  <button onClick={exportCard} style={{ ...ghostBtn(surface2, border), flex: '0 0 auto', width: 'auto', padding: '11px 15px' }}>&#x2913; Export</button>
                  <div style={{ flex: 1 }} />
                  <button onClick={closeEditor} style={{ background: 'transparent', border: `1px solid ${border2}`, color: 'var(--text,#F4F2F8)', padding: '11px 18px', borderRadius: 11, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveEditor} style={{ background: accent, color: '#fff', border: 'none', padding: '11px 24px', borderRadius: 11, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', boxShadow: '0 5px 16px rgba(124,107,245,.45)' }}>Save</button>
                </div>
              </div>
            </div>
          )}

          {toast && (
            <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', background: 'var(--text,#F4F2F8)', color: 'var(--bg,#15131E)', padding: '12px 20px', borderRadius: 12, fontWeight: 600, fontSize: 13.5, boxShadow: '0 12px 30px rgba(0,0,0,.35)', zIndex: 60, animation: 'anima-pop .25s ease' }}>{toast}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- small style helpers ----
function winBtn(dim) { return { width: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: dim, fontSize: 13, background: 'transparent' } }
function togglePill(surface2) { return { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: surface2, borderRadius: 11, padding: '9px 10px 9px 12px', cursor: 'pointer' } }
const pillLabel = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600 }
function card(surface, border) { return { background: surface, border, borderRadius: 16, padding: '20px 22px' } }
function ghostBtn(surface2, border) { return { flex: 1, background: surface2, border, color: 'var(--text,#F4F2F8)', padding: 13, borderRadius: 12, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } }
function editorLabel(dim) { return { fontSize: 12, fontWeight: 700, color: dim, textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 8 } }
