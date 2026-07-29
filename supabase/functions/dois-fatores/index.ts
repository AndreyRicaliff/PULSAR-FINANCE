// @ts-nocheck — ambiente Deno (tipos não resolvidos no tsc do app)
// Segundo fator por código de e-mail (Resend).
//
// Fluxo: o usuário já entrou com senha (sessão AAL1 existe, mas a RLS não deixa ela ler NADA
// enquanto não passar por aqui — ver sessao_verificada() na migration).
//   POST { acao: 'enviar' }            → gera código, guarda o HASH, manda por e-mail
//   POST { acao: 'verificar', codigo } → confere e marca ESTA sessão como verificada
//
// Decisões de segurança:
// - o código nunca é guardado em claro (SHA-256 com o session_id como sal natural);
// - a verificação vale para a SESSÃO do token, não para o usuário — verificar no notebook
//   não libera outro aparelho;
// - 5 tentativas por desafio e reenvio só a cada 45s (freio de força bruta e de flood);
// - erro genérico em código errado/expirado: não conta ao atacante o que falhou.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const VALIDADE_MIN = 10
const MAX_TENTATIVAS = 5
const REENVIO_S = 45
const DIAS_CONFIANCA = 30

const FROM = Deno.env.get('RESEND_FROM') ?? 'Pulsar Finance <noreply@agconsultorialtda.com>'

/** 6 dígitos com gerador criptográfico — Math.random é previsível e não serve aqui. */
function gerarCodigo(): string {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return String(buf[0] % 1_000_000).padStart(6, '0')
}

async function hash(codigo: string, sessionId: string): Promise<string> {
  const dados = new TextEncoder().encode(`${codigo}:${sessionId}`)
  const digest = await crypto.subtle.digest('SHA-256', dados)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Segredo do aparelho: 32 bytes do gerador criptográfico, base64url. Nasce AQUI —
 *  se o navegador escolhesse o próprio token, forjar confiança seria digitar no console. */
function gerarToken(): string {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hashToken(token: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Rótulo legível só para o dono reconhecer o aparelho ao revogar. Sem fingerprint: o
 *  user-agent aqui é DESCRIÇÃO, nunca prova de identidade — quem prova é o token. */
function rotuloDoAparelho(ua: string): string {
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Navegador'
  const so = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'sistema'
  return `${nav} · ${so}`
}

function emailHtml(codigo: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f2fa;font-family:Segoe UI,Arial,sans-serif;color:#1c1338">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%">
      <tr><td style="padding:0 0 18px;text-align:center">
        <span style="font-size:20px;font-weight:800;font-style:italic;color:#401C7F">Pulsar</span><span style="font-size:20px;font-weight:800;font-style:italic;color:#7048E8">Finance</span>
      </td></tr>
      <tr><td style="background:#fff;border:1px solid #e4defa;border-top:3px solid #401C7F;border-radius:12px;padding:28px;text-align:center">
        <p style="margin:0 0 8px;font-size:14px;color:#3a3357">Seu código de acesso</p>
        <p style="margin:0 0 14px;font-size:38px;font-weight:800;letter-spacing:10px;color:#401C7F;font-family:Consolas,monospace">${codigo}</p>
        <p style="margin:0;font-size:13px;color:#6e5ea6">Vale por ${VALIDADE_MIN} minutos.</p>
        <p style="margin:14px 0 0;font-size:12px;color:#8a7fb0">Se não foi você que tentou entrar, ignore este e-mail e troque sua senha.</p>
      </td></tr>
      <tr><td style="padding:16px 8px;text-align:center;font-size:11px;color:#6e5ea6">AG Consultoria · Muito além da contabilidade</td></tr>
    </table>
  </td></tr></table></body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Não autenticado' })
    const token = authHeader.slice(7)

    // O gateway (verify_jwt) já validou a assinatura; aqui só lemos os claims.
    let claims: Record<string, unknown> = {}
    try {
      claims = JSON.parse(atob(token.split('.')[1] ?? ''))
    } catch {
      return json({ error: 'Não autenticado' })
    }
    const userId = String(claims.sub ?? '')
    const sessionId = String(claims.session_id ?? '')
    const email = String(claims.email ?? '')
    if (!userId || !sessionId) return json({ error: 'Sessão inválida' })

    const body = await req.json().catch(() => ({}))
    const { acao, codigo } = body

    // ── ENVIAR ────────────────────────────────────────────────────────────────
    if (acao === 'enviar') {
      if (!email) return json({ error: 'Conta sem e-mail para receber o código' })

      // Freio de flood: um envio a cada 45s por sessão.
      const { data: recente } = await admin
        .from('painel_desafios_2fa')
        .select('criado_em')
        .eq('session_id', sessionId)
        .is('usado_em', null)
        .gte('criado_em', new Date(Date.now() - REENVIO_S * 1000).toISOString())
        .maybeSingle()
      if (recente) return json({ error: `Aguarde ${REENVIO_S}s para pedir outro código.` })

      const apiKey = Deno.env.get('RESEND_API_KEY')
      if (!apiKey) return json({ error: 'RESEND_API_KEY não configurada' })

      const cod = gerarCodigo()
      const { error: insErr } = await admin.from('painel_desafios_2fa').insert({
        user_id: userId,
        session_id: sessionId,
        codigo_hash: await hash(cod, sessionId),
        expira_em: new Date(Date.now() + VALIDADE_MIN * 60_000).toISOString(),
      })
      if (insErr) return json({ error: 'Não foi possível gerar o código' })

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject: `${cod} é seu código de acesso`,
          html: emailHtml(cod),
          text: `Seu código de acesso ao Pulsar Finance: ${cod}. Vale por ${VALIDADE_MIN} minutos.`,
        }),
      })
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}))
        return json({ error: 'Falha ao enviar o e-mail', detalhes: d })
      }
      void admin.rpc('limpar_desafios_2fa')
      // Devolve o e-mail MASCARADO — a tela confirma para onde foi sem expor o endereço.
      const [nome, dominio] = email.split('@')
      return json({ ok: true, enviadoPara: `${nome.slice(0, 2)}${'•'.repeat(Math.max(1, nome.length - 2))}@${dominio}` })
    }

    // ── VERIFICAR ─────────────────────────────────────────────────────────────
    if (acao === 'verificar') {
      const informado = String(codigo ?? '').replace(/\D/g, '')
      if (informado.length !== 6) return json({ error: 'Digite os 6 dígitos do código.' })

      const { data: desafio } = await admin
        .from('painel_desafios_2fa')
        .select('id, codigo_hash, tentativas, expira_em')
        .eq('session_id', sessionId)
        .is('usado_em', null)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!desafio) return json({ error: 'Peça um novo código.' })
      if (new Date(desafio.expira_em) < new Date()) return json({ error: 'Código expirado — peça um novo.' })
      if (desafio.tentativas >= MAX_TENTATIVAS) {
        await admin.from('painel_desafios_2fa').update({ usado_em: new Date().toISOString() }).eq('id', desafio.id)
        return json({ error: 'Muitas tentativas — peça um novo código.' })
      }

      if ((await hash(informado, sessionId)) !== desafio.codigo_hash) {
        await admin
          .from('painel_desafios_2fa')
          .update({ tentativas: desafio.tentativas + 1 })
          .eq('id', desafio.id)
        return json({ error: 'Código incorreto.' })
      }

      // Queima o desafio ANTES de liberar: um código serve uma vez só.
      await admin.from('painel_desafios_2fa').update({ usado_em: new Date().toISOString() }).eq('id', desafio.id)
      const { error: upErr } = await admin
        .from('painel_sessoes_2fa')
        .upsert({ session_id: sessionId, user_id: userId }, { onConflict: 'session_id' })
      if (upErr) return json({ error: 'Não foi possível liberar a sessão' })

      // "Confiar neste aparelho": emite o segredo UMA vez. O banco fica com o hash.
      let dispositivo: string | undefined
      if (body?.lembrar === true) {
        const token = gerarToken()
        const expira = new Date(Date.now() + DIAS_CONFIANCA * 86_400_000).toISOString()
        const { error } = await admin.from('painel_dispositivos_confiaveis').insert({
          user_id: userId,
          token_hash: await hashToken(token),
          rotulo: rotuloDoAparelho(req.headers.get('user-agent') ?? ''),
          expira_em: expira,
        })
        // Falhar aqui não pode derrubar o login — a sessão JÁ está liberada.
        if (!error) dispositivo = token
      }
      return json({ ok: true, dispositivo, diasConfianca: DIAS_CONFIANCA })
    }

    // ── APARELHO CONFIÁVEL ────────────────────────────────────────────────────
    // Troca o segredo do aparelho por uma sessão liberada, SEM mandar e-mail.
    if (acao === 'dispositivo') {
      const token = String(body?.token ?? '')
      if (token.length < 20) return json({ error: 'Aparelho não reconhecido' })

      const { data: disp } = await admin
        .from('painel_dispositivos_confiaveis')
        .select('id, user_id, expira_em')
        .eq('token_hash', await hashToken(token))
        .maybeSingle()

      // Amarrado ao DONO: token de um usuário não libera a sessão de outro.
      if (!disp || disp.user_id !== userId) return json({ error: 'Aparelho não reconhecido' })
      if (new Date(disp.expira_em) < new Date()) {
        await admin.from('painel_dispositivos_confiaveis').delete().eq('id', disp.id)
        return json({ error: 'Confiança do aparelho expirou' })
      }

      const { error: upErr } = await admin
        .from('painel_sessoes_2fa')
        .upsert({ session_id: sessionId, user_id: userId }, { onConflict: 'session_id' })
      if (upErr) return json({ error: 'Não foi possível liberar a sessão' })

      await admin
        .from('painel_dispositivos_confiaveis')
        .update({ ultimo_uso_em: new Date().toISOString() })
        .eq('id', disp.id)
      void admin.rpc('limpar_dispositivos_vencidos')
      return json({ ok: true })
    }

    return json({ error: 'ação desconhecida' })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'erro inesperado' })
  }
})
