import 'dotenv/config'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Departamento, DepartamentosSeed } from '../src/core/centros.ts'
import { listarDepartamentos } from './omie/client.ts'
import { loadOmieConfig, type OmieConfig } from './omie/config.ts'

const POR_PAGINA = 200
const OUTPUT = fileURLToPath(new URL('../src/data/departamentos.json', import.meta.url))

async function main(): Promise<void> {
  const config = loadOmieConfig(process.env)
  const departamentos = await buscarTodos(config)
  const seed: DepartamentosSeed = { geradoEm: new Date().toISOString(), departamentos }
  await writeFile(OUTPUT, `${JSON.stringify(seed, null, 2)}\n`, 'utf8')
  console.log(`✓ ${departamentos.length} departamentos salvos em ${OUTPUT}`)
}

async function buscarTodos(config: OmieConfig): Promise<Departamento[]> {
  const todos: Departamento[] = []
  let pagina = 1
  let totalPaginas = 1
  do {
    const r = await listarDepartamentos(config, { pagina, registros_por_pagina: POR_PAGINA })
    totalPaginas = r.total_de_paginas ?? totalPaginas
    for (const d of r.departamentos) {
      todos.push({
        codigo: d.codigo,
        descricao: d.descricao,
        estrutura: d.estrutura ?? '',
        inativo: d.inativo === 'S',
      })
    }
    pagina += 1
  } while (pagina <= totalPaginas)
  return todos
}

main().catch((err) => {
  console.error('✗ sync de departamentos falhou:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
