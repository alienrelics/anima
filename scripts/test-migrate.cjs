// Test the store.cjs load-time migration (old built-in persona text -> current seed).
// Stubs electron's app.getPath so store.cjs can run outside Electron.
const os = require('os')
const fs = require('fs')
const path = require('path')
const Module = require('module')

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'anima-migrate-'))
const orig = Module._load
Module._load = function (req, ...a) {
  if (req === 'electron') return { app: { getPath: () => TMP } }
  return orig.call(this, req, ...a)
}

const store = require(path.join(__dirname, '..', 'electron', 'store.cjs'))
const dataFile = path.join(TMP, 'anima-data.json')

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) { pass++; console.log('PASS —', name) } else { fail++; console.log('FAIL —', name) } }

const OLD_ROCKY = 'Talk like a tough but caring boxing coach. Short, punchy sentences. Push me hard, celebrate small wins, and never let me make excuses.'

// 1) An old saved Rocky card (boxing-coach seed) migrates to the Eridian voice.
const oldData = store.defaults()
const rk = oldData.cards.find((c) => c.id === 'rocky')
rk.talk = OLD_ROCKY
rk.desc = 'Tough-love coach. No excuses, no quitting.'
rk.glyph = '🥊'
fs.writeFileSync(dataFile, JSON.stringify(oldData, null, 2), 'utf8')
const r1 = store.load().cards.find((c) => c.id === 'rocky')
ok('old boxing-coach Rocky migrates to Eridian', /Eridian/.test(r1.talk))
ok('migrated desc updated', /Eridian/.test(r1.desc))
ok('migrated glyph -> crab', r1.glyph === '🦀')
ok('migration persisted to disk', /Eridian/.test(JSON.parse(fs.readFileSync(dataFile, 'utf8')).cards.find((c) => c.id === 'rocky').talk))

// 2) A user-edited Rocky card is left untouched.
const userData = store.defaults()
userData.cards.find((c) => c.id === 'rocky').talk = 'MY OWN CUSTOM ROCKY do not touch'
fs.writeFileSync(dataFile, JSON.stringify(userData, null, 2), 'utf8')
ok('user-edited Rocky left untouched', store.load().cards.find((c) => c.id === 'rocky').talk === 'MY OWN CUSTOM ROCKY do not touch')

// 3) Fresh install (no file) seeds the Eridian voice.
fs.rmSync(dataFile, { force: true })
ok('fresh seed is Eridian', /Eridian/.test(store.load().cards.find((c) => c.id === 'rocky').talk))

fs.rmSync(TMP, { recursive: true, force: true })
console.log(`\n${fail ? 'MIGRATION TESTS FAILED' : 'ALL MIGRATION TESTS PASS'} (${pass} pass, ${fail} fail)`)
process.exit(fail ? 1 : 0)
