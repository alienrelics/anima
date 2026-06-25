// Launch Electron with ELECTRON_RUN_AS_NODE cleared.
// Some environments set that flag globally, which makes `electron .` run as
// plain Node and breaks the app. This launcher strips it before spawning.
const { spawn } = require('child_process')
const electronPath = require('electron') // path string to the electron binary
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
if (process.argv.includes('--dev')) env.ANIMA_DEV = '1'
const child = spawn(electronPath, ['.'], { stdio: 'inherit', env })
child.on('close', (code) => process.exit(code))
