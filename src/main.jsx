import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const style = document.createElement('style')
style.textContent = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{height:100%}
  body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;overflow:hidden}
  input,textarea,select,button{font-family:inherit}
  @keyframes anima-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.82)}}
  @keyframes anima-slide{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes anima-fade{from{opacity:0}to{opacity:1}}
  @keyframes anima-pop{from{transform:scale(.94) translateY(8px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
  ::-webkit-scrollbar{width:10px;height:10px}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:8px;border:3px solid transparent;background-clip:padding-box}
  textarea::-webkit-scrollbar{width:8px}
`
document.head.appendChild(style)

createRoot(document.getElementById('root')).render(<App />)
