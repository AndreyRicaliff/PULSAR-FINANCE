import type { OmieConfig } from './config.ts'
import { isOmieFault } from './schema.ts'

const MAX_TENTATIVAS = 5
const BACKOFF_MS = 3000

// Chamada genérica à Omie com retry de throttle. endpoint ex.: 'geral/categorias',
// 'financas/mf'; call ex.: 'ListarCategorias', 'ListarMovimentos'.
export async function chamarOmie(
  config: OmieConfig,
  endpoint: string,
  call: string,
  param: unknown,
): Promise<unknown> {
  return comRetry(async () => {
    const json = await postar(config, endpoint, call, param)
    if (isOmieFault(json)) throw new Error(`Omie recusou: ${json.faultstring}`)
    return json
  })
}

async function comRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let tentativa = 1; ; tentativa += 1) {
    try {
      return await fn()
    } catch (err) {
      if (tentativa >= MAX_TENTATIVAS || !ehTransiente(err)) throw err
      await espera(esperaMs(err, tentativa))
    }
  }
}

function ehTransiente(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return msg.includes('requisição desse método') || msg.includes('redundante')
}

function esperaMs(err: unknown, tentativa: number): number {
  const m = err instanceof Error ? err.message.match(/aguarde (\d+) segundos/i) : null
  return m && m[1] ? (Number(m[1]) + 2) * 1000 : BACKOFF_MS * tentativa
}

function espera(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function postar(
  config: OmieConfig,
  endpoint: string,
  call: string,
  param: unknown,
): Promise<unknown> {
  const res = await fetch(`${config.OMIE_BASE_URL}/${endpoint}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_key: config.OMIE_APP_KEY,
      app_secret: config.OMIE_APP_SECRET,
      call,
      param: [param],
    }),
  })
  if (!res.ok && res.status !== 500) {
    throw new Error(`Omie ${call}: HTTP ${res.status} — ${await res.text()}`)
  }
  return res.json()
}
