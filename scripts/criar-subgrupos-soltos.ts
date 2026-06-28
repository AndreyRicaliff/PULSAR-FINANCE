/**
 * Re-concilia itens SOLTOS (categorias mapeadas direto na raiz do grupo): cria um
 * subgrupo nomeado conforme a categoria, sob o mesmo grupo, e remapeia. Assim o item
 * passa a aparecer separadamente nos gráficos. Backup em /tmp. Uso: npx tsx scripts/criar-subgrupos-soltos.ts
 */
import 'dotenv/config'
import { writeFileSync } from 'node:fs'

const URL = process.env.SUPABASE_URL ?? ''
const SK = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

async function doc(id: string, base: string): Promise<Record<string, unknown> | null> {
  const r = await fetch(`${URL}/rest/v1/painel_estado?chave=eq.cliente:${id}:${base}&select=dados`, {
    headers: { apikey: SK, Authorization: `Bearer ${SK}` },
  })
  const j = (await r.json()) as { dados?: Record<string, unknown> }[]
  return j[0]?.dados ?? null
}

async function salvar(id: string, dados: unknown): Promise<void> {
  const chave = `cliente:${id}:painel-ag-modelo-v4`
  const r = await fetch(`${URL}/rest/v1/painel_estado`, {
    method: 'POST',
    headers: { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ chave, dados }),
  })
  if (!r.ok) throw new Error(`${id}: ${r.status} ${await r.text()}`)
}

interface No { id: string; nome: string; paiId: string | null; meta?: unknown }

async function main(): Promise<void> {
  for (const [nome, id] of [
    ['ACME 27', '00000000-0000-4000-8000-000000000027'],
    ['ACME 36', '00000000-0000-4000-8000-000000000036'],
  ] as [string, string][]) {
    const modelo = await doc(id, 'painel-ag-modelo-v4')
    const mov = await doc(id, 'movimentos-raw')
    const cad = await doc(id, 'cadastros-raw')
    if (!modelo?.contas) {
      console.log(`${nome}: sem modelo, pulando`)
      continue
    }
    writeFileSync(`/tmp/backup-modelo-${id}-${nome.replace(/\s/g, '')}.json`, JSON.stringify(modelo, null, 2))
    const contas = modelo.contas as { estrutura: No[]; mapa: Record<string, string> }
    const estrutura = [...contas.estrutura]
    const mapa = { ...contas.mapa }
    const porId = new Map(estrutura.map((n) => [n.id, n]))
    const nomeCat = new Map(((cad?.categorias as { codigo: string; descricao: string }[]) ?? []).map((c) => [c.codigo, c.descricao]))
    const catsComMov = [...new Set(((mov?.movimentos as { categoria: string }[]) ?? []).map((m) => m.categoria))]

    const criados: string[] = []
    for (const cat of catsComMov) {
      const noId = mapa[cat]
      const no = noId ? porId.get(noId) : undefined
      if (!no || no.paiId !== null) continue // só os soltos (mapeados na raiz)
      const novoId = `subauto:${cat}`
      if (!porId.get(novoId)) {
        const novo: No = { id: novoId, nome: nomeCat.get(cat) ?? cat, paiId: no.id, meta: no.meta }
        estrutura.push(novo)
        porId.set(novoId, novo)
      }
      mapa[cat] = novoId
      criados.push(`${cat} ${nomeCat.get(cat) ?? ''} → subgrupo sob "${no.nome}"`)
    }
    await salvar(id, { ...modelo, contas: { estrutura, mapa } })
    console.log(`\n✓ ${nome}: ${criados.length} subgrupos criados (itens soltos resolvidos)`)
    criados.forEach((c) => console.log('  ', c))
  }
}

main().catch((e) => {
  console.error('✗', e instanceof Error ? e.message : e)
  process.exitCode = 1
})
