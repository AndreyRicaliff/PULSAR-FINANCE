import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ClienteInfo, ClientesSeed } from '../src/core/cliente.ts'
import { loadOmieConfig, type OmieConfig } from './omie/config.ts'
import { listarClientes } from './omie/client.ts'

const POR_PAGINA = 100
const MAX_PAGINAS = 500
const SLEEP_MS = 600
const OUTPUT = fileURLToPath(new URL('../src/data/clientes.json', import.meta.url))

async function main(): Promise<void> {
  const config = loadOmieConfig(process.env)
  const clientes = await buscarTodos(config)
  await salvar({ geradoEm: new Date().toISOString(), clientes })
  console.log(`✓ ${Object.keys(clientes).length} clientes/fornecedores salvos em ${OUTPUT}`)
}

async function buscarTodos(config: OmieConfig): Promise<Record<string, ClienteInfo>> {
  const mapa: Record<string, ClienteInfo> = {}
  let pagina = 1
  let totalPaginas = 1
  do {
    const r = await listarClientes(config, { pagina, registros_por_pagina: POR_PAGINA })
    totalPaginas = r.total_de_paginas ?? totalPaginas
    for (const c of r.clientes_cadastro_resumido) {
      mapa[String(c.codigo_cliente)] = {
        nome: c.nome_fantasia?.trim() || c.razao_social?.trim() || String(c.codigo_cliente),
        doc: c.cnpj_cpf?.trim() ?? '',
      }
    }
    const qtd = r.clientes_cadastro_resumido.length
    console.log(`  página ${pagina}/${totalPaginas} · ${qtd} clientes`)
    if (qtd < POR_PAGINA) break
    pagina += 1
    if (pagina <= totalPaginas) await espera(SLEEP_MS)
  } while (pagina <= totalPaginas && pagina <= MAX_PAGINAS)
  return mapa
}

function espera(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function salvar(seed: ClientesSeed): Promise<void> {
  await mkdir(dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, JSON.stringify(seed, null, 2), 'utf8')
}

main().catch((err: unknown) => {
  console.error('Sync de clientes falhou:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
