import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

/** Apaga TODOS os usuários de auth do projeto. Usar quando o login é descartado. */
const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main(): Promise<void> {
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) throw new Error(error.message)
  if (!data.users.length) {
    console.log('Nenhum usuário para apagar.')
    return
  }
  const r = await Promise.allSettled(data.users.map((u) => admin.auth.admin.deleteUser(u.id)))
  const ok = r.filter((x) => x.status === 'fulfilled').length
  console.log(`Apagados ${ok}/${data.users.length} usuários.`)
}

main().catch((e) => {
  console.error('Falha ao purgar:', e)
  process.exit(1)
})
