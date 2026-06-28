import 'dotenv/config'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Titulo, TitulosSeed } from '../src/core/titulo.ts'
import { chamarOmie } from './omie/http.ts'
import { loadOmieConfig, type OmieConfig } from './omie/config.ts'

const POR_PAGINA = 100
const SLEEP_MS = 700
const OUTPUT = fileURLToPath(new URL('../src/data/titulos.json', import.meta.url))

const FONTES = [
  { endpoint: 'financas/contapagar', call: 'ListarContasPagar', lista: 'conta_pagar_cadastro', natureza: 'P' as const },
  { endpoint: 'financas/contareceber', call: 'ListarContasReceber', lista: 'conta_receber_cadastro', natureza: 'R' as const },
]

async function main(): Promise<void> {
  const config = loadOmieConfig(process.env)
  const titulos: Titulo[] = []
  for (const f of FONTES) {
    const brutos = await buscarFonte(config, f.endpoint, f.call, f.lista)
    for (const b of brutos) titulos.push(extrair(b, f.natureza))
    console.log(`  ${f.call}: ${brutos.length} títulos`)
  }
  const seed: TitulosSeed = { geradoEm: new Date().toISOString(), titulos }
  await writeFile(OUTPUT, `${JSON.stringify(seed, null, 2)}\n`, 'utf8')
  console.log(`✓ ${titulos.length} títulos salvos em ${OUTPUT}`)
}

async function buscarFonte(
  config: OmieConfig,
  endpoint: string,
  call: string,
  lista: string,
): Promise<Record<string, unknown>[]> {
  const todos: Record<string, unknown>[] = []
  let pagina = 1
  let totalPaginas = 1
  do {
    const r = (await chamarOmie(config, endpoint, call, { pagina, registros_por_pagina: POR_PAGINA })) as Record<string, unknown>
    totalPaginas = typeof r.total_de_paginas === 'number' ? r.total_de_paginas : totalPaginas
    const itens = r[lista]
    if (Array.isArray(itens)) for (const i of itens) todos.push(i as Record<string, unknown>)
    pagina += 1
    if (pagina <= totalPaginas) await new Promise((res) => setTimeout(res, SLEEP_MS))
  } while (pagina <= totalPaginas)
  return todos
}

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')
const cent = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) : 0)

function extrair(b: Record<string, unknown>, natureza: 'P' | 'R'): Titulo {
  return {
    id: str(b.codigo_lancamento_omie),
    natureza,
    status: str(b.status_titulo),
    dataEmissao: str(b.data_emissao),
    dataVencimento: str(b.data_vencimento),
    dataPrevisao: str(b.data_previsao),
    valorCentavos: cent(b.valor_documento),
    documento: str(b.numero_documento),
    categoria: str(b.codigo_categoria),
    fornecedorCodigo: str(b.codigo_cliente_fornecedor),
    parcela: str(b.numero_parcela),
    contaCorrente: str(b.id_conta_corrente),
  }
}

main().catch((err) => {
  console.error('✗ sync de títulos falhou:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
