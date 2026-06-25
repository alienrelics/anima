// Anima chat hook — injects the active personality's writing style into Claude.
// Used for SessionStart and UserPromptSubmit. Reads Anima's live data file
// (path comes from hook-config.json written next to this script at connect time).
// Plain Node, no Electron needed. Always exits 0 so it never blocks a session.
const fs = require('fs')
const path = require('path')

function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { return null } }

let input = ''
process.stdin.on('data', (c) => { input += c })
process.stdin.on('end', () => {
  let hook = {}
  try { hook = JSON.parse(input || '{}') } catch (e) {}
  try {
    const cfg = readJSON(path.join(__dirname, 'hook-config.json')) || {}
    const data = cfg.dataPath ? readJSON(cfg.dataPath) : null
    if (!data || !data.state || !data.state.master) return process.exit(0)
    const active = (data.cards || []).find((c) => c.id === data.state.activeId)
    if (!active || !active.chat || !active.talk) return process.exit(0)

    const ruleset =
      `PERSONA ACTIVE — write every reply as the character "${active.name}".\n` +
      `Style: ${active.talk}\n` +
      `Reasoning stays full quality; only the wording takes on the character. ` +
      `Never let the voice make an answer wrong. Keep code, commands, file paths, ` +
      `errors and exact numbers in plain, correct form. Thai text is governed separately.`

    const ev = hook.hook_event_name || ''
    if (ev === 'UserPromptSubmit') {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ruleset },
      }))
    } else {
      process.stdout.write(ruleset)
    }
  } catch (e) { /* fail silent */ }
  process.exit(0)
})
