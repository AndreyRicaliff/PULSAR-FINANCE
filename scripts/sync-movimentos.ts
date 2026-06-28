import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Movimento, MovimentosSeed } from '../src/core/movimento.ts'
import { loadOmieConfig, type OmieConfig } from './omie/config.ts'
import { listarLancCC, listarMovimentos } from './omie/client.ts'
import { extrairMovimento } from './omie/movimento.ts'

const POR_PAGINA = 100
const MAX_PAGINAS = 500
const SLEEP_MS = 600
const OUTPUT = fileURLToPath(new URL('../src/data/movimentos.json', import.meta.url))

async function main(): Promise<void> {
  const config = loadOmieConfig(process.env)
  const brutos = await buscarTodos(config)
  const depPorLanc = await mapaDepartamentosCC(config)
  const movimentos = enriquecerDepartamentos(brutos, depPorLanc)
  const comDep = movimentos.filter((m) => m.departamento).length
  const total = movimentos.reduce((acc, m) => acc + m.valorCentavos, 0)
  await salvar({ geradoEm: new Date().toISOString(), movimentos })
  console.log(`✓ ${movimentos.length} movimentos salvos em ${OUTPUT}`)
  console.log(`  total movimentado: ${(total / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
  console.log(`  com centro de custo: ${comDep} (via rateio LancCC: ${depPorLanc.size} lançamentos rateados)`)
}

// O rateio por departamento dos eventos de extrato só aparece no ListarLancCC
// (financas/mf não expõe). Join: movimento.idMovCC (nCodMovCC) === nCodLanc.
async function mapaDepartamentosCC(config: OmieConfig): Promise<Map<string, string>> {
  const mapa = new Map<string, string>()
  let pagina = 1
  let totalPaginas = 1
  do {
    const r = await listarLancCC(config, { nPagina: pagina, nRegPorPagina: 200 })
    totalPaginas = r.nTotPaginas ?? totalPaginas
    for (const l of r.listaLancamentos) {
      const dep = departamentoPrincipal(l.departamentos)
      if (dep && l.nCodLanc != null) mapa.set(String(l.nCodLanc), dep)
    }
    pagina += 1
    if (pagina <= totalPaginas) await espera(SLEEP_MS)
  } while (pagina <= totalPaginas && pagina <= MAX_PAGINAS)
  return mapa
}

/** Rateio pode ter N departamentos; usamos o de maior percentual (sem dividir valores). */
function departamentoPrincipal(bruto: unknown): string {
  if (!Array.isArray(bruto) || bruto.length === 0) return ''
  const deps = bruto
    .map((d) => (d && typeof d === 'object' ? (d as Record<string, unknown>) : {}))
    .sort((a, b) => Number(b.nPerDep ?? 0) - Number(a.nPerDep ?? 0))
  const cod = deps[0]?.cCodDep
  return typeof cod === 'string' || typeof cod === 'number' ? String(cod) : ''
}

function enriquecerDepartamentos(movs: readonly Movimento[], depPorLanc: ReadonlyMap<string, string>): Movimento[] {
  return movs.map((m) => {
    if (m.departamento || !m.idMovCC) return m
    const dep = depPorLanc.get(m.idMovCC)
    return dep ? { ...m, departamento: dep } : m
  })
}

async function buscarTodos(config: OmieConfig): Promise<Movimento[]> {
  const todos: Movimento[] = []
  let pagina = 1
  let totalPaginas = 1
  do {
    const r = await listarMovimentos(config, { nPagina: pagina, nRegPorPagina: POR_PAGINA })
    totalPaginas = r.nTotPaginas ?? totalPaginas
    for (const mov of r.movimentos) todos.push(extrairMovimento(mov))
    console.log(`  página ${pagina}/${totalPaginas} · ${r.movimentos.length} movimentos`)
    pagina += 1
    if (pagina <= totalPaginas) await espera(SLEEP_MS)
  } while (pagina <= totalPaginas && pagina <= MAX_PAGINAS)
  return todos
}

function espera(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function salvar(seed: MovimentosSeed): Promise<void> {
  await mkdir(dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, JSON.stringify(seed, null, 2), 'utf8')
}

main().catch((err: unknown) => {
  console.error('Sync de movimentos falhou:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
