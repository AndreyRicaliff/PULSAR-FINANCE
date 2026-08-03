// @ts-nocheck — ambiente Deno
// Convida um acesso de CLIENTE por e-mail real: cria a conta (marcada convite_ag no
// app_metadata — o trigger de signup só aceita AG ou convite), vincula aos clientes e
// manda o link de definir senha via Resend. Só operador com sessão 2FA verificada chama.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const FROM = Deno.env.get('RESEND_FROM') ?? 'Pulsar Finance <noreply@agconsultorialtda.com>'
const SITE = Deno.env.get('SITE_URL') ?? 'https://pulsar-finance-mu.vercel.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const auth = req.headers.get('Authorization') ?? ''
    if (!auth.startsWith('Bearer ')) return json({ error: 'Não autenticado' })
    let claims: Record<string, unknown> = {}
    try {
      claims = JSON.parse(atob(auth.slice(7).split('.')[1] ?? ''))
    } catch {
      return json({ error: 'Não autenticado' })
    }
    const chamador = String(claims.sub ?? '')
    const sessao = String(claims.session_id ?? '')
    if (!chamador || !sessao) return json({ error: 'Sessão inválida' })

    // Portões explícitos (SECURITY DEFINER não herda RLS): 2FA da sessão + papel operador.
    const { data: s2fa } = await admin.from('painel_sessoes_2fa').select('session_id').eq('session_id', sessao).maybeSingle()
    if (!s2fa) return json({ error: 'Sessão não verificada (2FA)' })
    const { data: op } = await admin.from('painel_acessos').select('id').eq('user_id', chamador).eq('papel', 'operador').limit(1)
    if (!op?.length) return json({ error: 'Só operador convida acessos' })

    const body = await req.json().catch(() => ({}))
    const email = String(body?.email ?? '').trim().toLowerCase()
    const clienteIds: string[] = Array.isArray(body?.clienteIds) ? body.clienteIds.map(String) : []
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'E-mail inválido' })
    if (!clienteIds.length) return json({ error: 'Escolha ao menos um cliente' })

    // Senha aleatória forte — o convidado nunca a vê: define a dele pelo link de recuperação.
    const buf = new Uint8Array(24)
    crypto.getRandomValues(buf)
    const senha = btoa(String.fromCharCode(...buf))

    const { data: criado, error: eCria } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      app_metadata: { convite_ag: '1' },
    })
    if (eCria) return json({ error: `Não foi possível criar a conta: ${eCria.message}` })
    const userId = criado.user.id

    const { error: eVinc } = await admin
      .from('painel_acessos')
      .insert(clienteIds.map((cid) => ({ user_id: userId, cliente_id: cid, papel: 'cliente' })))
    if (eVinc) {
      await admin.auth.admin.deleteUser(userId) // não deixa conta órfã sem vínculo
      return json({ error: `Falha ao vincular: ${eVinc.message}` })
    }

    const { data: link, error: eLink } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: SITE },
    })
    if (eLink) return json({ error: `Conta criada, mas o link falhou: ${eLink.message}` })
    // INTERMEDIÁRIA anti-scanner: Outlook/Hotmail pré-visitam links e QUEIMAVAM o token de
    // uso único antes do clique humano. O e-mail aponta pro app (?convite=<verify-url>);
    // o app mostra um botão e só o clique dispara a verificação no GoTrue.
    const verify = link.properties?.action_link ?? ''
    const url = `${SITE}/?convite=${encodeURIComponent(verify)}`

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: 'Seu acesso ao Pulsar Finance',
        html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f2fa;font-family:Segoe UI,Arial,sans-serif;color:#1c1338">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="460" cellpadding="0" cellspacing="0" style="max-width:460px;width:100%">
<tr><td style="padding:0 0 18px;text-align:center"><span style="font-size:20px;font-weight:800;font-style:italic;color:#401C7F">Pulsar</span><span style="font-size:20px;font-weight:800;font-style:italic;color:#7048E8">Finance</span></td></tr>
<tr><td style="background:#fff;border:1px solid #e4defa;border-top:3px solid #401C7F;border-radius:12px;padding:28px">
<p style="margin:0 0 10px;font-size:16px;font-weight:700">Você foi convidado</p>
<p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#3a3357">A AG Consultoria criou seu acesso ao painel financeiro. Defina sua senha para entrar — o painel é seu retrato em tempo real: resultados, fluxo de caixa e contas aguardando sua aprovação.</p>
<p style="margin:0;text-align:center"><a href="${url}" style="display:inline-block;background:#401C7F;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px">Definir minha senha</a></p>
<p style="margin:16px 0 0;font-size:12px;color:#8a7fb0">Se você não esperava este convite, ignore este e-mail.</p>
</td></tr>
<tr><td style="padding:16px 8px;text-align:center;font-size:11px;color:#6e5ea6">AG Consultoria · Muito além da contabilidade</td></tr>
</table></td></tr></table></body></html>`,
        text: `A AG Consultoria criou seu acesso ao Pulsar Finance. Defina sua senha: ${url}`,
      }),
    })
    if (!resp.ok) return json({ error: 'Conta criada, mas o e-mail de convite falhou — reenvie pelo painel' })

    return json({ ok: true, userId })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'erro inesperado' })
  }
})
