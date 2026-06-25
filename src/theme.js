// CSS-variable palettes for dark and light, ported from the approved design.
export function themeVars(t) {
  if (t === 'dark') return {
    '--bg': '#15131E', '--surface': '#211E2D', '--surface2': '#2B2738', '--track': '#3A3550',
    '--border': 'rgba(255,255,255,0.09)', '--border2': 'rgba(255,255,255,0.18)',
    '--text': '#F4F2F8', '--dim': '#A7A2B5', '--accent': '#7C6BF5', '--accentSoft': 'rgba(124,107,245,0.18)',
    '--titlebar': '#1B1925',
    '--wall': 'radial-gradient(1100px 700px at 20% -10%,rgba(124,107,245,0.22),transparent 60%),radial-gradient(900px 600px at 95% 110%,rgba(232,108,169,0.14),transparent 55%),#100E18',
  }
  return {
    '--bg': '#F1EDE6', '--surface': '#FFFFFF', '--surface2': '#F4F1EB', '--track': '#D8D2C8',
    '--border': 'rgba(30,22,46,0.08)', '--border2': 'rgba(30,22,46,0.16)',
    '--text': '#26222F', '--dim': '#736E7E', '--accent': '#7C6BF5', '--accentSoft': 'rgba(124,107,245,0.12)',
    '--titlebar': '#FBF9F5',
    '--wall': 'radial-gradient(1100px 700px at 18% -10%,rgba(124,107,245,0.16),transparent 60%),radial-gradient(900px 600px at 95% 110%,rgba(232,108,169,0.10),transparent 55%),#EDE7DD',
  }
}

// Pill switch (track + knob) styles. big = the larger master/autostart size.
export function sw(on, big) {
  const w = big ? 46 : 44, h = big ? 27 : 25
  return {
    track: { width: w + 'px', height: h + 'px', borderRadius: h + 'px', padding: '3px', display: 'flex', alignItems: 'center', background: on ? 'var(--accent,#7C6BF5)' : 'var(--track,#3A3550)', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'background .2s', flex: '0 0 auto', boxShadow: on ? '0 2px 8px rgba(124,107,245,.45)' : 'none' },
    knob: { width: (h - 6) + 'px', height: (h - 6) + 'px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.35)' },
  }
}

export const SWATCHES = [
  'linear-gradient(135deg,#FF9A62,#FF6F4D)',
  'linear-gradient(135deg,#7FD6A6,#4FB286)',
  'linear-gradient(135deg,#8B7BF7,#E86CA9)',
  'linear-gradient(135deg,#9AA0C7,#6F75A0)',
  'linear-gradient(135deg,#62C6FF,#4D8DFF)',
  'linear-gradient(135deg,#FFD56B,#FF9E3D)',
]
