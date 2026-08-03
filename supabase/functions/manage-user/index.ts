// @ts-nocheck — ambiente Deno (tipos não resolvidos no tsc do app)
// Gestão de acessos do Pulsar Finance (porta do padrão líder). SÓ operador chama.
// Cria/reseta/remove logins de cliente com service_role → sem e-mail, sem Resend, sem magic link
// (email_confirm:true). Contrato: erros de negócio viajam como 200 { error } (supabase-js engole
// corpo non-2xx). Login = username; vira <login>@agconsultorialtda.com (trigger de domínio exige).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const DOMINIO = 'agconsultorialtda.com'
const emailDeLogin = (login: string) => {
  const l = String(login).trim()
  return l.includes('@') ? l : `${l}@${DOMINIO}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado' })
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const {
      data: { user: callerUser },
      error: callerErr,
    } = await caller.auth.getUser()
    if (callerErr || !callerUser) return json({ error: 'Não autenticado' })

    // Autorização: só quem tem papel 'operador' gerencia acessos (a RLS não protege a Admin API).
    const { data: opRow } = await admin
      .from('painel_acessos')
      .select('id')
      .eq('user_id', callerUser.id)
      .eq('papel', 'operador')
      .maybeSingle()
    if (!opRow) return json({ error: 'Apenas operador pode gerenciar acessos' })

    // 2º FATOR também aqui (auditoria 03/08): a RLS exige sessao_verificada(), mas esta função
    // usa service_role e passa POR FORA dela — senha de operador vazada, sozinha, criava
    // operador novo e resetava senhas sem nunca completar o 2FA. Mesmo gate de convidar-acesso.
    let sessionId = ''
    try {
      sessionId = String(JSON.parse(atob(authHeader.replace(/^Bearer\s+/i, '').split('.')[1] ?? '')).session_id ?? '')
    } catch {
      /* token não-JWT: cai no fail-closed abaixo */
    }
    if (!sessionId) return json({ error: 'Sessão inválida' })
    const { data: s2fa } = await admin.from('painel_sessoes_2fa').select('session_id').eq('session_id', sessionId).maybeSingle()
    if (!s2fa) return json({ error: 'Confirme o código de verificação (2FA) antes de gerenciar acessos' })

    const { action, login, password, user_id, cliente_ids, papel } = await req.json()

    if (action === 'list-accounts') {
      const [acessosR, usersR, clientesR] = await Promise.all([
        admin.from('painel_acessos').select('user_id, cliente_id, papel'),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        admin.from('painel_clientes').select('id, nome'),
      ])
      if (acessosR.error) throw acessosR.error
      if (usersR.error) throw usersR.error
      if (clientesR.error) throw clientesR.error
      const byUser = new Map(usersR.data.users.map((u) => [u.id, u]))
      const nomeCli = new Map((clientesR.data ?? []).map((c) => [c.id, c.nome]))
      const porUser = new Map()
      for (const a of acessosR.data ?? []) {
        if (!porUser.has(a.user_id)) porUser.set(a.user_id, { user_id: a.user_id, papel: 'cliente', empresas: [] })
        const acc = porUser.get(a.user_id)
        if (a.papel === 'operador') acc.papel = 'operador'
        if (a.cliente_id) acc.empresas.push({ id: a.cliente_id, nome: nomeCli.get(a.cliente_id) ?? a.cliente_id })
      }
      const accounts = [...porUser.values()].map((acc) => {
        const u = byUser.get(acc.user_id)
        const email = u?.email ?? null
        return { ...acc, email, login: email ? email.split('@')[0] : '', last_sign_in_at: u?.last_sign_in_at ?? null }
      })
      return json({ accounts })
    }

    if (action === 'create') {
      if (!login || !password) return json({ error: 'Login e senha são obrigatórios' })
      if (String(password).length < 6) return json({ error: 'A senha precisa ter ao menos 6 caracteres' })
      const novoPapel = papel === 'operador' ? 'operador' : 'cliente'
      const ids = Array.isArray(cliente_ids) ? cliente_ids.filter(Boolean) : []
      if (novoPapel === 'cliente' && ids.length === 0) return json({ error: 'Cliente exige ao menos uma empresa' })
      const { data: novo, error: cErr } = await admin.auth.admin.createUser({
        email: emailDeLogin(login),
        password,
        email_confirm: true,
      })
      if (cErr) throw cErr
      const linhas =
        novoPapel === 'operador'
          ? [{ user_id: novo.user.id, papel: 'operador', cliente_id: null }]
          : ids.map((cid: string) => ({ user_id: novo.user.id, papel: 'cliente', cliente_id: cid }))
      const { error: aErr } = await admin.from('painel_acessos').insert(linhas)
      if (aErr) {
        await admin.auth.admin.deleteUser(novo.user.id) // rollback
        throw aErr
      }
      return json({ success: true, user_id: novo.user.id, email: emailDeLogin(login) })
    }

    if (action === 'update-password') {
      if (!user_id || !password) return json({ error: 'Usuário e senha são obrigatórios' })
      if (String(password).length < 6) return json({ error: 'A senha precisa ter ao menos 6 caracteres' })
      if (user_id === callerUser.id) return json({ error: 'Para a própria conta use "Definir senha"' })
      const { error } = await admin.auth.admin.updateUserById(user_id, { password })
      if (error) throw error
      return json({ success: true })
    }

    if (action === 'delete') {
      if (!user_id) return json({ error: 'Usuário é obrigatório' })
      if (user_id === callerUser.id) return json({ error: 'Não é possível excluir a própria conta' })
      await admin.from('painel_acessos').delete().eq('user_id', user_id)
      const { error } = await admin.auth.admin.deleteUser(user_id)
      if (error) throw error
      return json({ success: true })
    }

    return json({ error: 'Ação inválida' })
  } catch (e) {
    console.error('manage-user error:', e)
    return json({ error: e instanceof Error ? e.message : 'Erro inesperado' })
  }
})
