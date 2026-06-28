import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { ACME_ID, chaveDoCliente } from '../src/core/tenant.ts'

/**
 * Semeia a conciliação da SIMULAÇÃO no Supabase, na chave do cliente Acme
 * (camada editada por tenant). Fonte única: public/simular.html. É dado descartável —
 * não é o padrão do código; o botão "Restaurar" no app volta à estrutura limpa.
 */
const SIMULAR = fileURLToPath(new URL('../public/simular.html', import.meta.url))
const CHAVE = chaveDoCliente(ACME_ID, 'painel-ag-modelo-v4')

function extrairModelo(html: string): unknown {
  const m = html.match(/setItem\('painel-ag-modelo-v4',\s*"((?:[^"\\]|\\.)*)"\)/)
  if (!m) throw new Error('mapa da simulação não encontrado em simular.html')
  return JSON.parse(JSON.parse(`"${m[1]}"`))
}

async function main(): Promise<void> {
  const html = await readFile(SIMULAR, 'utf8')
  const dados = extrairModelo(html)
  const mapa = (dados as { contas?: { mapa?: Record<string, string> } }).contas?.mapa ?? {}

  const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)
  const { error } = await sb.from('painel_estado').upsert({ chave: CHAVE, dados })
  if (error) throw new Error(error.message)

  console.log(`Simulação gravada: ${Object.keys(mapa).length} categorias conciliadas em "${CHAVE}".`)
}

main().catch((e) => {
  console.error('Falha no seed:', e)
  process.exit(1)
})
