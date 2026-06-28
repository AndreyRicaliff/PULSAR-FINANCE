import 'dotenv/config'
import { Client } from 'pg'

const REF = 'your-project-ref'

/** Conexão direta (IPv6) ao Postgres do projeto financeiro. Server-only — usa a senha do DB. */
export function novaConexao(): Client {
  const password = process.env.SUPABASE_DB_PASSWORD
  if (!password) throw new Error('SUPABASE_DB_PASSWORD ausente no .env')
  return new Client({
    host: `db.${REF}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  })
}

export async function comConexao<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = novaConexao()
  await c.connect()
  try {
    return await fn(c)
  } finally {
    await c.end()
  }
}
