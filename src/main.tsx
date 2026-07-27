import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonte SELF-HOSTED e ÚNICA (Inter). Local porque, vindo do Google Fonts por CDN, rede
// que bloqueia ou atrasa fonts.googleapis.com derruba o app no tipo do sistema — o
// "fonte padrão bugada". Única porque a família Pulsar padronizou UMA fonte nos dois
// produtos: hierarquia por peso/tamanho/tracking, não por troca de tipo.
import '@fontsource-variable/inter'
import { App } from './App.tsx'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('elemento #root não encontrado')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
