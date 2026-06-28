/**
 * @file Gera um HTML STANDALONE de análise fiscal (fora do app, read-only): DRE e DFC
 * expansíveis até as CLASSES (grupo → subgrupo → classe), pelo MESMO motor do app
 * (totaisEfetivos + caixa na DFC), usando os modelos salvos SEM alterá-los.
 * Uso: npx tsx scripts/analise-fiscal.ts  → escreve em ~/Downloads/analise-fiscal-dre-dfc.html
 */
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { arvorePorGrupo, totaisEfetivos, type SubgrupoArvore } from '../src/core/classes'
import { calcular, demonstracaoPadrao, type Demonstracao, type LinhaCalc } from '../src/core/demonstracao'
import { ESTRUTURA_PADRAO_AG, type Conciliacao, type No } from '../src/core/modelo'
import { movimentosCaixa, type Movimento } from '../src/core/movimento'
import type { Categoria } from '../src/core/categoria'

const URL = process.env.SUPABASE_URL ?? ''
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const EMPRESAS: [string, string][] = [
  ['ACME 27', '00000000-0000-4000-8000-000000000027'],
  ['ACME 36', '00000000-0000-4000-8000-000000000036'],
]

async function doc(id: string, base: string): Promise<Record<string, unknown> | null> {
  const r = await fetch(`${URL}/rest/v1/painel_estado?chave=eq.cliente:${id}:${base}&select=dados`, {
    headers: { apikey: SK, Authorization: `Bearer ${SK}` },
  })
  const j = (await r.json()) as { dados?: Record<string, unknown> }[]
  return j[0]?.dados ?? null
}

const brl = (c: number) =>
  (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cls = (v: number) => (v < 0 ? 'neg' : v > 0 ? 'pos' : 'zero')

interface Demos {
  readonly dre: Demonstracao
  readonly dfc: Demonstracao
}

/** Resolve nome de uma chave efetiva (grupo / sub:<id> / cls:<codigo>). */
function nomeChave(chave: string, noPorId: Map<string, No>, catNome: Map<string, string>): string {
  if (chave.startsWith('sub:')) return noPorId.get(chave.slice(4))?.nome ?? chave.slice(4)
  if (chave.startsWith('cls:')) { const c = chave.slice(4); return `${c} ${catNome.get(c) ?? ''}`.trim() }
  return noPorId.get(chave)?.nome ?? chave
}

function arvoreHtml(subs: readonly SubgrupoArvore[]): string {
  if (!subs.length) return '<div class="vazio">sem movimento</div>'
  return subs
    .map(
      (s) => `<details class="sub"><summary><span>↳ ${esc(s.nome)}</span><b class="${cls(s.totalCentavos)}">${brl(s.totalCentavos)}</b></summary>
        ${s.classes.map((c) => `<div class="classe"><span>· ${esc(c.nome)}</span><b class="${cls(c.totalCentavos)}">${brl(c.totalCentavos)}</b></div>`).join('')}
      </details>`,
    )
    .join('')
}

function demoHtml(
  titulo: string,
  linhas: readonly LinhaCalc[],
  totalPorChave: Map<string, number>,
  arvore: Map<string, SubgrupoArvore[]>,
  noPorId: Map<string, No>,
  catNome: Map<string, string>,
): string {
  const linhaHtml = (l: LinhaCalc) => {
    if (l.tipo === 'subtotal') {
      return `<div class="subtotal"><span>${esc(l.nome)}</span><b class="${cls(l.valorCentavos)}">${brl(l.valorCentavos)}</b></div>`
    }
    if (!l.gruposIds.length) {
      return `<div class="linha-vazia"><span>${esc(l.nome)}</span><b class="zero">—</b></div>`
    }
    const grupos = l.gruposIds
      .map((gid) => {
        const v = totalPorChave.get(gid) ?? 0
        const subs = gid.startsWith('sub:') || gid.startsWith('cls:') ? [] : arvore.get(gid) ?? []
        const corpo = subs.length ? arvoreHtml(subs) : '<div class="vazio">sem classes (categoria solta)</div>'
        return `<details class="grupo"><summary><span>${esc(nomeChave(gid, noPorId, catNome))}</span><b class="${cls(v)}">${brl(v)}</b></summary>${corpo}</details>`
      })
      .join('')
    return `<details class="linha" open><summary><span>${esc(l.nome)}</span><b class="${cls(l.valorCentavos)}">${brl(l.valorCentavos)}</b></summary>${grupos}</details>`
  }
  return `<section class="demo"><h3>${esc(titulo)}</h3>${linhas.map(linhaHtml).join('')}</section>`
}

function empresaHtml(nome: string, conc: Conciliacao, movs: Movimento[], cats: Categoria[], demos: Demos): string {
  const noPorId = new Map<string, No>(conc.estrutura.map((n) => [n.id, n]))
  const catNome = new Map(cats.map((c) => [c.codigo, c.descricao]))

  const efDre = totaisEfetivos(movs, conc, cats, demos.dre, 'dre')
  const dre = calcular({ linhas: demos.dre.linhas, mapa: efDre.mapaEfetivo }, efDre.totalPorChave)
  const arvDre = arvorePorGrupo(movs, conc, cats)

  const movC = movimentosCaixa(movs)
  const efDfc = totaisEfetivos(movC, conc, cats, demos.dfc, 'dfc')
  const dfc = calcular({ linhas: demos.dfc.linhas, mapa: efDfc.mapaEfetivo }, efDfc.totalPorChave)
  const arvDfc = arvorePorGrupo(movC, conc, cats)

  return `<article class="empresa"><h2>${esc(nome)} <small>${movs.length} movimentos · ${cats.length} categorias</small></h2>
    <div class="cols">
      ${demoHtml('DRE (competência)', dre, efDre.totalPorChave, arvDre, noPorId, catNome)}
      ${demoHtml('DFC (caixa · valor pago)', dfc, efDfc.totalPorChave, arvDfc, noPorId, catNome)}
    </div>
  </article>`
}

const CSS = `
:root{--bg:#0E0E16;--surface:#141428;--surface2:#1D1B2E;--bd:rgba(255,255,255,.10);--text:#fff;--muted:#9187B6;--pos:#7FB89C;--neg:#E1746B;--primary:#7048E8}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 Inter,system-ui,sans-serif;padding:28px}
h1{font-size:22px;margin:0 0 4px}.sub{}.cab small,h2 small{color:var(--muted);font-weight:400;font-size:12px}
.aviso{color:var(--muted);font-size:12.5px;margin:0 0 22px;border-left:3px solid var(--primary);padding-left:12px}
.empresa{margin-bottom:34px}.empresa>h2{font-size:18px;border-bottom:1px solid var(--bd);padding-bottom:8px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:20px}@media(max-width:1000px){.cols{grid-template-columns:1fr}}
.demo h3{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:14px 0 8px}
details{border-radius:8px}summary{display:flex;justify-content:space-between;gap:12px;align-items:center;cursor:pointer;padding:6px 10px;border-radius:8px;list-style:none}
summary::-webkit-details-marker{display:none}summary:hover{background:var(--surface2)}
.linha{background:var(--surface);border:1px solid var(--bd);margin-bottom:6px}.linha>summary{font-weight:600}
.grupo{margin:2px 0 2px 14px}.grupo>summary{font-size:13px;color:#cfc8ea}
.sub{margin-left:16px}.sub>summary{font-size:12.5px;color:var(--muted)}
.classe{display:flex;justify-content:space-between;gap:12px;padding:3px 10px 3px 34px;font-size:12px;color:var(--muted)}
.subtotal{display:flex;justify-content:space-between;gap:12px;padding:8px 10px;font-weight:700;background:rgba(112,72,232,.10);border-radius:8px;margin:4px 0}
.linha-vazia{display:flex;justify-content:space-between;padding:6px 10px;color:var(--muted);opacity:.6}
.vazio{padding:4px 10px 4px 34px;font-size:11px;color:var(--muted);opacity:.6}
b{font-weight:600;font-variant-numeric:tabular-nums}.pos{color:var(--pos)}.neg{color:var(--neg)}.zero{color:var(--muted)}
`

async function main(): Promise<void> {
  const partes: string[] = []
  for (const [nome, id] of EMPRESAS) {
    const modelo = await doc(id, 'painel-ag-modelo-v4')
    const conc = (modelo?.contas as Conciliacao) ?? { estrutura: ESTRUTURA_PADRAO_AG, mapa: {} }
    const movs = ((await doc(id, 'movimentos-raw'))?.movimentos as Movimento[]) ?? []
    const cats = ((await doc(id, 'cadastros-raw'))?.categorias as Categoria[]) ?? []
    const dem = await doc(id, 'painel-ag-demonstracoes-v1')
    const demos: Demos = {
      dre: (dem?.dre as Demonstracao) ?? demonstracaoPadrao('dre', conc.estrutura),
      dfc: (dem?.dfc as Demonstracao) ?? demonstracaoPadrao('dfc', conc.estrutura),
    }
    partes.push(empresaHtml(nome, conc, movs, cats, demos))
    console.log(`${nome}: ${movs.length} movs, ${cats.length} categorias`)
  }
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Análise Fiscal · DRE/DFC por Classe</title><style>${CSS}</style></head><body>
<h1>Análise Fiscal — DRE / DFC por Classe</h1>
<p class="aviso">Visão de analista (read-only) · expanda linha → grupo → subgrupo → classe · DRE por competência, DFC por caixa (valor pago) · gerado dos modelos salvos sem alterá-los.</p>
${partes.join('')}
</body></html>`
  const saida = join(homedir(), 'Downloads', 'analise-fiscal-dre-dfc.html')
  writeFileSync(saida, html, 'utf8')
  console.log(`\n✓ HTML gerado: ${saida} (${(html.length / 1024).toFixed(0)} KB)`)
}

main().catch((e) => {
  console.error('✗', e instanceof Error ? e.message : e)
  process.exitCode = 1
})
