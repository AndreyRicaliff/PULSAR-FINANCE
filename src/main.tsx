import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fontes SELF-HOSTED (§2 da v3.1 pede fonte local). Antes vinham do Google Fonts por CDN:
// em rede que bloqueia ou atrasa fonts.googleapis.com o app caía no tipo do sistema — o
// "fonte padrão bugada". Agora viajam no bundle e não dependem de terceiro.
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import { App } from './App.tsx'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('elemento #root não encontrado')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
