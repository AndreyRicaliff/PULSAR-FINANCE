/**
 * Aplica a Matriz de Classificação AG ao modelo salvo de um cliente: atualiza a
 * estrutura de contas para o padrão parametrizado e realoca as categorias pendentes
 * pelo motor de sugestão. NUNCA sobrescreve de-para existente (trabalho manual vence);
 * faz backup do doc anterior em /tmp antes de gravar.
 *
 * Uso: npx tsx scripts/aplicar-matriz.ts [clienteId] [--realinhar]
 *   default: Acme; --realinhar também MOVE de-paras existentes para o destino
 *   prescrito pela matriz quando divergirem (reporta cada mudança).
 */
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { sugerirClassificacao } from '../src/core/matriz-classificacao.ts'
import { ESTRUTURA_PADRAO_AG, MIGRACAO_NOS } from '../src/core/plano-padrao.ts'
import { ACME_ID, chaveDoCliente } from '../src/core/tenant.ts'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const args = process.argv.slice(2)
const REALINHAR = args.includes('--realinhar')
const clienteId = args.find((a) => !a.startsWith('--')) ?? ACME_ID
const CHAVE = chaveDoCliente(clienteId, 'painel-ag-modelo-v4')

interface DocModelo {
  readonly contas?: { estrutura?: unknown[]; mapa?: Record<string, string> }
  readonly [k: string]: unknown
}

async function lerDoc(): Promise<DocModelo> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/painel_estado?chave=eq.${encodeURIComponent(CHAVE)}&select=dados`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  })
  const rows = (await r.json()) as { dados?: DocModelo }[]
  return rows[0]?.dados ?? {}
}

async function gravarDoc(dados: unknown): Promise<void> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/painel_estado`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ chave: CHAVE, dados }),
  })
  if (!r.ok) throw new Error(`gravação falhou: ${r.status} ${await r.text()}`)
}

/** Lê um doc do painel_estado do cliente por base de chave. */
async function lerDocBase(base: string): Promise<Record<string, unknown> | null> {
  const chave = chaveDoCliente(clienteId, base)
  const r = await fetch(`${SUPABASE_URL}/rest/v1/painel_estado?chave=eq.${encodeURIComponent(chave)}&select=dados`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  })
  const rows = (await r.json()) as { dados?: Record<string, unknown> }[]
  return rows[0]?.dados ?? null
}

/** Categorias VIVAS do cliente (cadastros-raw), código → descrição — multi-tenant correto. */
async function nomesDasCategorias(): Promise<Map<string, string>> {
  const cad = await lerDocBase('cadastros-raw')
  const cats = (cad?.categorias ?? []) as { codigo: string; descricao: string }[]
  return new Map(cats.map((c) => [c.codigo, c.descricao]))
}

/** Códigos de categoria que têm movimento no cliente (movimentos-raw). */
async function categoriasComMovimento(): Promise<string[]> {
  const mov = await lerDocBase('movimentos-raw')
  const movs = (mov?.movimentos ?? []) as { categoria: string }[]
  return [...new Set(movs.map((m) => m.categoria))]
}

async function main(): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes no .env')
  const doc = await lerDoc()
  writeFileSync(`/tmp/backup-modelo-${Date.now()}.json`, JSON.stringify(doc, null, 2))

  const idsNovos = new Set(ESTRUTURA_PADRAO_AG.map((n) => n.id))
  const nomes = await nomesDasCategorias()
  const cats = await categoriasComMovimento()
  console.log(`  categorias vivas: ${nomes.size} · com movimento: ${cats.length}`)
  const mapaAtual = doc.contas?.mapa ?? {}
  const { mapa, preservadas, migradas, perdidas } = migrarExistentes(mapaAtual, idsNovos)
  const realinhadas = REALINHAR ? realinharExistentes(mapa, idsNovos, nomes) : []
  const { realocadas, semOpiniao, genericas } = realocarPendentes(mapa, idsNovos, nomes, cats)

  await gravarDoc({ ...doc, contas: { estrutura: ESTRUTURA_PADRAO_AG, mapa } })

  console.log(`✓ ${CHAVE}`)
  console.log(`  estrutura de contas → padrão parametrizado (${ESTRUTURA_PADRAO_AG.length} nós)`)
  console.log(`  preservadas (suas): ${preservadas} · migradas de id antigo: ${migradas} · perdidas: ${perdidas.length}`)
  for (const p of perdidas) console.log(`    ⚠ perdida (nó inexistente): ${p}`)
  console.log(`  realinhadas à matriz: ${realinhadas.length}`)
  for (const r of realinhadas) console.log(`    ${r}`)
  console.log(`  realocadas pela matriz: ${realocadas.length}`)
  for (const r of realocadas) console.log(`    ${r}`)
  console.log(`  sem opinião da matriz (ficam em A Conciliar): ${semOpiniao.length}`)
  for (const s of semOpiniao) console.log(`    · ${s}`)
  for (const g of genericas) console.log(`    ⚠ genérica (R3 — quebrar manualmente): ${g}`)
}

function migrarExistentes(
  mapaAtual: Readonly<Record<string, string>>,
  idsNovos: ReadonlySet<string>,
): { mapa: Record<string, string>; preservadas: number; migradas: number; perdidas: string[] } {
  const mapa: Record<string, string> = {}
  let preservadas = 0
  let migradas = 0
  const perdidas: string[] = []
  for (const [categoria, noId] of Object.entries(mapaAtual)) {
    const destino = MIGRACAO_NOS[noId] ?? noId
    if (!idsNovos.has(destino)) {
      perdidas.push(`${categoria} → ${noId}`)
      continue
    }
    mapa[categoria] = destino
    if (destino === noId) preservadas += 1
    else migradas += 1
  }
  return { mapa, preservadas, migradas, perdidas }
}

/** Move de-paras existentes para o destino da matriz quando divergirem (modo --realinhar). */
function realinharExistentes(
  mapa: Record<string, string>,
  idsNovos: ReadonlySet<string>,
  nomes: ReadonlyMap<string, string>,
): string[] {
  const mudancas: string[] = []
  for (const [codigo, atual] of Object.entries(mapa)) {
    const nome = nomes.get(codigo) ?? ''
    const s = sugerirClassificacao(nome)
    if (!s?.noId || !idsNovos.has(s.noId) || s.noId === atual) continue
    mapa[codigo] = s.noId
    const alerta = s.premissas.length ? ` ⚠ ${s.premissas.join(' ')}` : ''
    mudancas.push(`${codigo} · ${nome}: ${atual} → ${s.noId}${alerta}`)
  }
  return mudancas
}

function realocarPendentes(
  mapa: Record<string, string>,
  idsNovos: ReadonlySet<string>,
  nomes: ReadonlyMap<string, string>,
  cats: readonly string[],
): { realocadas: string[]; semOpiniao: string[]; genericas: string[] } {
  const realocadas: string[] = []
  const semOpiniao: string[] = []
  const genericas: string[] = []
  for (const codigo of [...cats].sort()) {
    if (mapa[codigo]) continue
    const nome = nomes.get(codigo) ?? ''
    const s = sugerirClassificacao(nome)
    if (s?.noId && idsNovos.has(s.noId)) {
      mapa[codigo] = s.noId
      const alerta = s.premissas.length ? ` ⚠ ${s.premissas.join(' ')}` : ''
      realocadas.push(`${codigo} · ${nome} → ${s.noId}${alerta}`)
    } else if (s?.premissas.includes('R3')) {
      genericas.push(`${codigo} · ${nome}`)
    } else {
      semOpiniao.push(`${codigo} · ${nome}`)
    }
  }
  return { realocadas, semOpiniao, genericas }
}

main().catch((err) => {
  console.error('✗ aplicar-matriz falhou:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
