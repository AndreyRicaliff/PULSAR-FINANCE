// @ts-nocheck — ambiente Deno (tipos não resolvidos no tsc do app)
// E-mail transacional do Pulsar Finance via Resend (padrão da família — porta do
// send-welcome-email do PULSAR-RH, com o gate de papel do Finance no lugar de ADMIN_EMAIL).
//
// SÓ operador dispara. A chave da Resend vive nos secrets da edge — nunca no browser.
// Contrato: erros de negócio viajam como 200 { error } (supabase-js engole corpo non-2xx).
//
// POST { template: 'boas-vindas', para, login, nomeEmpresa }
// POST { template: 'apresentacao', para, nomeEmpresa, competencia, anexoBase64?, anexoNome? }
//
// Secrets: RESEND_API_KEY · RESEND_FROM · SITE_URL
// Regra dura: SENHA NUNCA viaja por e-mail — o e-mail de boas-vindas traz login + link;
// a senha o operador entrega por outro canal. (Diferente do RH, decisão nossa.)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const FROM = Deno.env.get('RESEND_FROM') ?? 'Pulsar Finance <noreply@agconsultorialtda.com>'
const SITE = Deno.env.get('SITE_URL') ?? 'https://pulsarfinance.agconsultorialtda.com'

// Identidade v3.1 inline (e-mail não carrega CSS externo): fundo claro por deliberação —
// cliente lê no celular/Outlook, dark-first de produto não vale para inbox.
function moldura(titulo: string, corpo: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f2fa;font-family:Segoe UI,Arial,sans-serif;color:#1c1338">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">
      <tr><td style="padding:0 0 18px;text-align:center">
        <span style="font-size:20px;font-weight:800;font-style:italic;color:#401C7F">Pulsar</span>
        <span style="font-size:20px;font-weight:800;font-style:italic;color:#7048E8">Finance</span>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #e4defa;border-top:3px solid #401C7F;border-radius:12px;padding:28px">
        <h1 style="margin:0 0 12px;font-size:18px;color:#1c1338">${titulo}</h1>
        ${corpo}
      </td></tr>
      <tr><td style="padding:16px 8px;text-align:center;font-size:11px;color:#6e5ea6">
        AG Consultoria · Muito além da contabilidade<br/>
        <a href="${SITE}" style="color:#7048E8">${SITE.replace('https://', '')}</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`
}

const paragrafo = (t: string) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#3a3357">${t}</p>`
const botao = (rotulo: string, href: string) =>
  `<p style="margin:20px 0 8px;text-align:center"><a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#7048E8,#A55EFF);color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px">${rotulo}</a></p>`

function montar(body: Record<string, unknown>) {
  const t = body.template
  if (t === 'boas-vindas') {
    const { para, login, nomeEmpresa } = body
    if (!para || !login || !nomeEmpresa) return { erro: 'campos: para, login, nomeEmpresa' }
    return {
      para,
      assunto: `Seu acesso ao Pulsar Finance — ${nomeEmpresa}`,
      html: moldura(
        `Bem-vindo ao Pulsar Finance`,
        paragrafo(`O painel financeiro de <strong>${nomeEmpresa}</strong> está pronto: DRE, fluxo de caixa e relatórios sempre atualizados pela AG.`) +
          paragrafo(`Seu usuário de acesso é <strong style="color:#401C7F">${login}</strong>.`) +
          paragrafo(`A senha chega por outro canal, direto com a equipe AG — nunca por e-mail.`) +
          botao('Acessar o painel', SITE),
      ),
      texto: `Bem-vindo ao Pulsar Finance. Empresa: ${nomeEmpresa}. Usuário: ${login}. A senha chega por outro canal. Acesse: ${SITE}`,
    }
  }
  if (t === 'apresentacao') {
    const { para, nomeEmpresa, competencia, anexoBase64, anexoNome } = body
    if (!para || !nomeEmpresa || !competencia) return { erro: 'campos: para, nomeEmpresa, competencia' }
    const anexos =
      anexoBase64 && anexoNome ? [{ filename: anexoNome, content: anexoBase64 }] : undefined
    return {
      para,
      assunto: `Apresentação financeira ${competencia} — ${nomeEmpresa}`,
      html: moldura(
        `Sua apresentação de ${competencia} está pronta`,
        paragrafo(`A AG fechou a análise financeira de <strong>${nomeEmpresa}</strong> referente a <strong>${competencia}</strong>.`) +
          (anexos
            ? paragrafo(`O arquivo em anexo abre em qualquer navegador, sem internet e sem login.`)
            : botao('Ver no painel', SITE)),
      ),
      texto: `Apresentação ${competencia} de ${nomeEmpresa} disponível. ${anexos ? 'Arquivo em anexo.' : `Acesse: ${SITE}`}`,
      anexos,
    }
  }
  return { erro: `template desconhecido: ${String(t)}` }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Não autenticado' })
    const token = authHeader.slice(7)

    // Dois chamadores legítimos: servidor (service_role — automações) e OPERADOR logado.
    // Cliente autenticado NÃO dispara e-mail — fail-closed no papel.
    // Com verify_jwt=true o gateway JÁ validou a assinatura do token; ler o claim `role`
    // do payload é seguro (comparar string com a env falha: a env guarda outra variante).
    let roleDoToken = ''
    try {
      roleDoToken = JSON.parse(atob(token.split('.')[1] ?? '')).role ?? ''
    } catch {
      /* token opaco (sb_secret) não é JWT — segue pro caminho de usuário */
    }
    if (roleDoToken !== 'service_role') {
      const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: { user }, error } = await caller.auth.getUser()
      if (error || !user) return json({ error: 'Não autenticado' })
      const { data: opRow } = await admin
        .from('painel_acessos')
        .select('id')
        .eq('user_id', user.id)
        .eq('papel', 'operador')
        .maybeSingle()
      if (!opRow) return json({ error: 'Apenas operador envia e-mail' })
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) return json({ error: 'RESEND_API_KEY não configurada' })

    const body = await req.json().catch(() => ({}))
    const m = montar(body)
    if ('erro' in m) return json({ error: m.erro })

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [m.para],
        subject: m.assunto,
        html: m.html,
        text: m.texto,
        ...(m.anexos ? { attachments: m.anexos } : {}),
      }),
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) return json({ error: 'Falha no envio', status: resp.status, detalhes: data })
    return json({ ok: true, id: data?.id })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'erro inesperado' })
  }
})
