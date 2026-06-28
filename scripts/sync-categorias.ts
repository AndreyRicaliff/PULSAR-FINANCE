import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  Categoria,
  Natureza,
  RelatorioCategorias,
} from '../src/core/categoria.ts'
import { loadOmieConfig } from './omie/config.ts'
import { listarCategorias } from './omie/client.ts'
import { mapCategoria } from './omie/map.ts'
import { completarRaizes } from './omie/complete-roots.ts'

const POR_PAGINA = 50
const OUTPUT = fileURLToPath(new URL('../src/data/categorias.json', import.meta.url))

async function main(): Promise<void> {
  const config = loadOmieConfig(process.env)
  const categorias = await buscarTodas(config)
  const relatorio = analisar(categorias)
  await salvar({ geradoEm: new Date().toISOString(), relatorio, categorias })
  console.log(`✓ ${categorias.length} categorias da Omie salvas em ${OUTPUT}`)
  console.table(relatorio.porNatureza)
}

// Sequencial de propósito: a Omie recusa chamadas concorrentes do mesmo método.
async function buscarTodas(config: Awaited<ReturnType<typeof loadOmieConfig>>): Promise<Categoria[]> {
  const todas: Categoria[] = []
  let pagina = 1
  let totalPaginas = 1
  do {
    const r = await listarCategorias(config, { pagina, registros_por_pagina: POR_PAGINA })
    totalPaginas = r.total_de_paginas
    todas.push(...r.categoria_cadastro.map(mapCategoria))
    pagina += 1
  } while (pagina <= totalPaginas)
  return completarRaizes(todas)
}

function analisar(categorias: readonly Categoria[]): RelatorioCategorias {
  const agrupadoras = categorias.filter((c) => c.agrupadora).length
  return {
    total: categorias.length,
    porNatureza: contarPorNatureza(categorias),
    agrupadoras,
    analiticas: categorias.length - agrupadoras,
    inativas: categorias.filter((c) => !c.ativa).length,
  }
}

function contarPorNatureza(categorias: readonly Categoria[]): Record<Natureza, number> {
  const acc: Record<Natureza, number> = { receita: 0, despesa: 0, transferencia: 0, outra: 0 }
  for (const c of categorias) acc[c.natureza] += 1
  return acc
}

async function salvar(dados: unknown): Promise<void> {
  await mkdir(dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, JSON.stringify(dados, null, 2), 'utf8')
}

main().catch((err: unknown) => {
  console.error('Sync falhou:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
