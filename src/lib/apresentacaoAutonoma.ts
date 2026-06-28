/**
 * @file Exporta a Apresentação como HTML offline AUTOSSUFICIENTE: embute o bundle real do app
 * (mesmos componentes) + um snapshot dos dados do cliente. Abre sem rede, idêntico ao app,
 * tema claro por padrão. O app, ao ver window.__AG_SNAPSHOT__, troca o Supabase pelo mock.
 */
import type { Intervalo } from '@/core/periodo'
import type { Tenant } from '@/core/tenant'
import type { SnapshotApresentacao } from './apresentacaoSnapshot'
import { supabase } from './supabase'

interface LinhaEstado {
  readonly chave: string
  readonly dados: unknown
}

/** Junta painel_estado (remoto) + edições locais ainda não sincronizadas do cliente ativo. */
async function coletarSnapshot(ativo: Tenant): Promise<SnapshotApresentacao> {
  const estado: Record<string, unknown> = {}
  if (supabase) {
    const { data } = await supabase.from('painel_estado').select('chave, dados').like('chave', `cliente:${ativo.id}:%`)
    for (const row of (data as LinhaEstado[] | null) ?? []) estado[row.chave] = row.dados
  }
  const prefixo = `cliente:${ativo.id}:`
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith(prefixo)) continue
    try {
      estado[k] = JSON.parse(localStorage.getItem(k) ?? 'null')
    } catch {
      /* chave corrompida no storage — o remoto já entrou acima */
    }
  }
  return { clienteAtivoId: ativo.id, clientes: [ativo], estado, geradoEm: new Date().toISOString() }
}

async function buscarTexto(url: string): Promise<string> {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`falha ao buscar ${url}: HTTP ${r.status}`)
  return r.text()
}

async function comoDataUri(url: string): Promise<string> {
  const buf = await (await fetch(url)).arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return `data:font/woff2;base64,${btoa(bin)}`
}

/** Embute a Inter (Google Fonts) como base64 no CSS → fonte idêntica mesmo offline. */
async function inlinarFontes(doc: Document): Promise<void> {
  doc.querySelectorAll('link[rel="preconnect"]').forEach((l) => l.remove())
  await Promise.all(
    [...doc.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]')].map(async (link) => {
      const href = link.getAttribute('href')
      if (!href) return
      let css = await buscarTexto(href)
      const urls = [
        ...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]!)),
      ]
      const pares = await Promise.all(urls.map(async (u) => [u, await comoDataUri(u)] as const))
      for (const [u, data] of pares) css = css.split(u).join(data)
      const style = doc.createElement('style')
      style.textContent = css
      link.replaceWith(style)
    }),
  )
}

async function inlinar(doc: Document, seletor: string, atrib: string, criar: (conteudo: string) => Element): Promise<void> {
  const base = location.origin
  await Promise.all(
    [...doc.querySelectorAll(seletor)].map(async (el) => {
      const ref = el.getAttribute(atrib)
      if (!ref) return
      el.replaceWith(criar(await buscarTexto(new URL(ref, base).href)))
    }),
  )
}

/** Embute o index.html + todos os assets (JS/CSS) num único documento, com o snapshot injetado. */
async function montarHtmlAutonomo(snapshot: SnapshotApresentacao, ativo: Tenant): Promise<string> {
  // BASE_URL = '/' no Vercel/Netlify, '/ag-painel/' no GitHub Pages — o index vive sob o base.
  const indexHtml = await buscarTexto(new URL(`${import.meta.env.BASE_URL}index.html`, location.origin).href)
  const doc = new DOMParser().parseFromString(indexHtml, 'text/html')

  // Tema claro já no HTML estático (sem flash dark→light antes do app montar).
  doc.documentElement.classList.remove('dark')
  doc.documentElement.classList.add('light')

  await inlinarFontes(doc)
  await inlinar(doc, 'link[rel="stylesheet"]', 'href', (css) => {
    const style = doc.createElement('style')
    style.textContent = css
    return style
  })
  await inlinar(doc, 'script[src]', 'src', (js) => {
    const s = doc.createElement('script')
    s.type = 'module'
    s.textContent = js
    return s
  })
  doc.querySelectorAll('link[rel="modulepreload"]').forEach((l) => l.remove())

  // Script regular (não-módulo) no topo do <head>: roda ANTES dos módulos deferidos →
  // o snapshot e o tema claro já estão prontos quando o app inicializa.
  const inj = doc.createElement('script')
  const json = JSON.stringify(snapshot).replace(/</g, '\\u003c')
  inj.textContent =
    `window.__AG_SNAPSHOT__=${json};` +
    `try{if(!localStorage.getItem('lumen-tema'))localStorage.setItem('lumen-tema','light');` +
    `localStorage.setItem('lumen-cliente-ativo',${JSON.stringify(ativo.id)})}catch(e){}`
  doc.head.insertBefore(inj, doc.head.firstChild)

  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`
}

function baixar(nome: string, html: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Gera e baixa o HTML offline autossuficiente da apresentação do cliente ativo. */
export async function exportarApresentacao(ativo: Tenant, periodo?: Intervalo): Promise<void> {
  const base = await coletarSnapshot(ativo)
  const snapshot = periodo && (periodo.inicio || periodo.fim) ? { ...base, periodo: { inicio: periodo.inicio, fim: periodo.fim } } : base
  const html = await montarHtmlAutonomo(snapshot, ativo)
  baixar(`apresentacao-${slug(ativo.nome) || 'cliente'}.html`, html)
}
