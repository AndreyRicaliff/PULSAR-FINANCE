/**
 * Edge Function: sync manual da Omie por cliente.
 * Roda server-side (secret da Omie só aqui). Atualiza só valores de títulos já conhecidos
 * e adiciona os novos (que caem em "a conciliar" por não terem categoria mapeada). Grava o
 * doc cru em painel_estado (chave cliente:<id>:movimentos-raw).
 *
 * Deploy: supabase functions deploy sync-omie
 * Secrets: supabase secrets set OMIE_APP_KEY=… OMIE_APP_SECRET=… OMIE_BASE_URL=https://app.omie.com.br/api/v1
 * (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm no ambiente da função.)
 *
 * O merge é o mesmo de src/core/sincronizacao.ts (inlined por isolamento do Deno; coberto
 * por testes lá). Untested aqui até o 1º deploy — validar uma execução real.
 */
// @ts-nocheck — ambiente Deno (tipos não resolvidos no tsc do app)
const POR_PAGINA = 100
const MAX_PAGINAS = 500

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const obj = (v) => (v && typeof v === 'object' ? v : {})
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const str = (v) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')
const cent = (v) => Math.round(num(v) * 100)

function extrairCategoria(mov) {
  const det = obj(mov.detalhes), cab = obj(mov.cabecalho), cat0 = obj((mov.categorias ?? [])[0])
  return str(det.cCodCateg || cab.cCodCateg || mov.cCodCateg || mov.codigo_categoria || cat0.cCodCateg).trim()
}

function extrairValor(mov) {
  const det = obj(mov.detalhes), cab = obj(mov.cabecalho)
  for (const v of [cab.nValorLanc, det.nValorMovCC, det.nValorTitulo, det.nValorLanc, mov.nValorLanc, mov.nValorMovCC, mov.valor, mov.nValor]) {
    if (num(v) !== 0) return num(v)
  }
  return 0
}

function extrairMovimento(mov) {
  const det = obj(mov.detalhes), res = obj(mov.resumo)
  return {
    idTitulo: str(det.nCodTitulo), categoria: extrairCategoria(mov) || 'SEM_CATEGORIA',
    valorCentavos: Math.round(extrairValor(mov) * 100), campoValor: '',
    data: str(det.dDtEmissao || det.dDtVenc || det.dDtRegistro || det.dDtPagamento || det.dDtConcilia),
    dataEmissao: str(det.dDtEmissao), dataRegistro: str(det.dDtRegistro), dataPrevisao: str(det.dDtPrevisao),
    dataVencimento: str(det.dDtVenc), dataPagamento: str(det.dDtPagamento), dataConciliacao: str(det.dDtConcilia),
    status: str(det.cStatus), liquidado: str(res.cLiquidado), documento: str(det.cNumTitulo || det.cNumDocFiscal),
    parcela: str(det.cNumParcela), contraparte: str(det.cCPFCNPJCliente), contraparteCodigo: str(det.nCodCliente),
    natureza: str(det.cNatureza), grupo: str(det.cGrupo), origem: str(det.cOrigem), tipoDocumento: str(det.cTipo),
    operacao: str(det.cOperacao), contaCorrente: str(det.nCodCC),
    departamento: str(det.cCodDepartamento || obj((mov.departamentos ?? [])[0]).cCodDepartamento),
    idMovCC: str(det.nCodMovCC),
    jurosCentavos: cent(res.nJuros),
    multaCentavos: cent(res.nMulta), descontoCentavos: cent(res.nDesconto),
    valorPagoCentavos: cent(res.nValPago), valorAbertoCentavos: cent(res.nValAberto),
  }
}

const CV = ['valorCentavos', 'valorPagoCentavos', 'valorAbertoCentavos', 'jurosCentavos', 'multaCentavos', 'descontoCentavos', 'status', 'liquidado', 'departamento']

// A camada crua é espelho read-only: substituímos o conjunto inteiro (edições vivem em
// camada de override separada). A chave abaixo identifica o movimento entre versões:
// título tem id estável; evento de extrato (nCodTitulo=0) é imutável — identidade =
// doc|conta|data|valor|operação. Se o banco reprocessa, vira removido+novo (leitura correta).
const chaveMov = (m) =>
  m.idTitulo && m.idTitulo !== '0'
    ? `t:${m.idTitulo}|${m.parcela}`
    : `e:${m.documento}|${m.contaCorrente}|${m.data}|${m.valorCentavos}|${m.operacao}`

const resumoMov = (m) => ({
  data: m.data, documento: m.documento, contraparte: m.contraparte,
  categoria: m.categoria, natureza: m.natureza, valorCentavos: m.valorCentavos,
})

const mudancas = (atual, novo) =>
  CV.filter((c) => atual[c] !== novo[c]).map((c) => ({ campo: c, de: atual[c], para: novo[c] }))

function diffDetalhado(atuais, recebidos) {
  const antigos = new Map(atuais.map((m) => [chaveMov(m), m]))
  const novos = [], atualizados = []
  const vistos = new Set()
  for (const novo of recebidos) {
    const k = chaveMov(novo)
    vistos.add(k)
    const atual = antigos.get(k)
    if (!atual) { novos.push(novo); continue }
    const m = mudancas(atual, novo)
    if (m.length) atualizados.push({ mov: resumoMov(novo), mudancas: m })
  }
  const removidos = atuais.filter((m) => !vistos.has(chaveMov(m)))
  return { novos, atualizados, removidos }
}

const DET_MAX = 60 // itens por lista de detalhe (cap sinalizado via truncado/total)
const HIST_MAX = 40 // entradas de histórico mantidas

const capar = (lista) => ({ itens: lista.slice(0, DET_MAX), total: lista.length, truncado: lista.length > DET_MAX })

function entradaHistorico(d, totalRecebidos, primeira) {
  return {
    em: new Date().toISOString(),
    total: totalRecebidos,
    primeira,
    contagens: { novos: d.novos.length, atualizados: d.atualizados.length, removidos: d.removidos.length },
    detalhes: {
      novos: capar(d.novos.map(resumoMov)),
      atualizados: capar(d.atualizados),
      removidos: capar(d.removidos.map(resumoMov)),
    },
  }
}

async function omiePagina(env, nPagina) {
  const res = await fetch(`${env.OMIE_BASE_URL}/financas/mf/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_key: env.OMIE_APP_KEY, app_secret: env.OMIE_APP_SECRET, call: 'ListarMovimentos', param: [{ nPagina, nRegPorPagina: POR_PAGINA }] }),
  })
  const json = await res.json()
  if (json?.faultstring) throw new Error(`Omie: ${json.faultstring}`)
  return json
}

async function buscarOmie(env) {
  const todos = []
  let pagina = 1, totPaginas = 1
  do {
    const r = await omiePagina(env, pagina)
    totPaginas = r.nTotPaginas ?? totPaginas
    for (const m of r.movimentos ?? []) todos.push(extrairMovimento(m))
    pagina++
  } while (pagina <= totPaginas && pagina <= MAX_PAGINAS)
  return todos
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

async function omieCall(env, endpoint, call, param) {
  for (let tentativa = 1; ; tentativa++) {
    const res = await fetch(`${env.OMIE_BASE_URL}/${endpoint}/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_key: env.OMIE_APP_KEY, app_secret: env.OMIE_APP_SECRET, call, param: [param] }),
    })
    const json = await res.json()
    if (!json?.faultstring) return json
    if (tentativa >= 3 || !/redundante|requisição desse método/i.test(json.faultstring)) throw new Error(`Omie: ${json.faultstring}`)
    await espera(8000)
  }
}

// Rateio por departamento dos eventos de extrato só existe no ListarLancCC; o join com o
// movimento do mf é nCodMovCC === nCodLanc. Usa o departamento de maior percentual.
function departamentoPrincipal(deps) {
  if (!Array.isArray(deps) || deps.length === 0) return ''
  const ord = [...deps].sort((a, b) => num(obj(b).nPerDep) - num(obj(a).nPerDep))
  return str(obj(ord[0]).cCodDep)
}

async function mapaDepartamentosCC(env) {
  const mapa = new Map()
  let pagina = 1, totPaginas = 1
  do {
    const r = await omieCall(env, 'financas/contacorrentelancamentos', 'ListarLancCC', { nPagina: pagina, nRegPorPagina: 200 })
    totPaginas = r.nTotPaginas ?? totPaginas
    for (const l of r.listaLancamentos ?? []) {
      const dep = departamentoPrincipal(l.departamentos)
      if (dep && l.nCodLanc != null) mapa.set(String(l.nCodLanc), dep)
    }
    pagina++
  } while (pagina <= totPaginas && pagina <= MAX_PAGINAS)
  return mapa
}

// Best-effort: falha no LancCC (throttle persistente) não derruba o sync principal.
async function enriquecerDepartamentos(env, movimentos) {
  try {
    const depPorLanc = await mapaDepartamentosCC(env)
    if (depPorLanc.size === 0) return movimentos
    return movimentos.map((m) => {
      if (m.departamento || !m.idMovCC) return m
      const dep = depPorLanc.get(m.idMovCC)
      return dep ? { ...m, departamento: dep } : m
    })
  } catch (_e) {
    return movimentos
  }
}

// ── Cadastros (categorias, clientes, departamentos) ──────────────────────────
// Mesmo padrão dos movimentos: foto completa a cada sync, gravada em cadastros-raw.
// O mapeamento replica o gerador dos seeds (validado campo a campo contra eles).

async function listarPaginado(env, endpoint, call, chaveLista) {
  const itens = []
  let pagina = 1, tot = 1
  do {
    const r = await omieCall(env, endpoint, call, { pagina, registros_por_pagina: 200 })
    tot = r.total_de_paginas ?? 1
    itens.push(...(r[chaveLista] ?? []))
    pagina++
  } while (pagina <= tot && pagina <= MAX_PAGINAS)
  return itens
}

// A Omie não devolve as raízes do plano ('0','1','2') no Listar — sintetizadas como no seed.
const RAIZES_CATEGORIA = [
  { codigo: '0', descricao: 'Transferências', natureza: 'transferencia' },
  { codigo: '1', descricao: 'Receitas', natureza: 'receita' },
  { codigo: '2', descricao: 'Despesas', natureza: 'despesa' },
]

function mapearCategorias(brutas) {
  const cats = brutas.map((c) => ({
    codigo: str(c.codigo),
    descricao: str(c.descricao),
    natureza: c.transferencia === 'S' ? 'transferencia' : c.conta_receita === 'S' ? 'receita' : c.conta_despesa === 'S' ? 'despesa' : 'outra',
    paiCodigo: str(c.categoria_superior) || null,
    agrupadora: c.totalizadora === 'S',
    ativa: c.conta_inativa !== 'S',
    entraNoDre: c.nao_exibir !== 'S',
  }))
  const presentes = new Set(cats.map((c) => c.codigo))
  const raizes = RAIZES_CATEGORIA.filter((r) => !presentes.has(r.codigo))
    .map((r) => ({ ...r, paiCodigo: null, agrupadora: true, ativa: true, entraNoDre: false }))
  return [...raizes, ...cats]
}

function relatorioCategorias(cats) {
  const porNatureza = { receita: 0, despesa: 0, transferencia: 0, outra: 0 }
  for (const c of cats) porNatureza[c.natureza]++
  return {
    total: cats.length,
    porNatureza,
    agrupadoras: cats.filter((c) => c.agrupadora).length,
    analiticas: cats.filter((c) => !c.agrupadora).length,
    inativas: cats.filter((c) => !c.ativa).length,
  }
}

function mapearClientes(brutos) {
  const clientes = {}
  for (const c of brutos) {
    const codigo = str(c.codigo_cliente)
    if (codigo) clientes[codigo] = { nome: str(c.nome_fantasia) || str(c.razao_social), doc: str(c.cnpj_cpf) }
  }
  return clientes
}

function mapearDepartamentos(brutos) {
  return brutos.map((d) => ({
    codigo: str(d.codigo), descricao: str(d.descricao), estrutura: str(d.estrutura), inativo: d.inativo === 'S',
  }))
}

async function buscarCadastros(env) {
  const [cats, clis, deps] = await Promise.all([
    listarPaginado(env, 'geral/categorias', 'ListarCategorias', 'categoria_cadastro'),
    listarPaginado(env, 'geral/clientes', 'ListarClientesResumido', 'clientes_cadastro_resumido'),
    listarPaginado(env, 'geral/departamentos', 'ListarDepartamentos', 'departamentos'),
  ])
  const categorias = mapearCategorias(cats)
  return {
    categorias,
    relatorio: relatorioCategorias(categorias),
    clientes: mapearClientes(clis),
    departamentos: mapearDepartamentos(deps),
  }
}

// ── Títulos (contas a pagar / receber — endpoints dedicados, status pronto) ──
function mapearTitulo(t, natureza) {
  const cat0 = obj((t.categorias ?? [])[0])
  return {
    id: str(t.codigo_lancamento_omie),
    natureza,
    status: str(t.status_titulo),
    dataEmissao: str(t.data_emissao),
    dataVencimento: str(t.data_vencimento),
    dataPrevisao: str(t.data_previsao),
    valorCentavos: cent(t.valor_documento),
    documento: str(t.numero_documento),
    categoria: str(t.codigo_categoria) || str(cat0.codigo_categoria),
    fornecedorCodigo: str(t.codigo_cliente_fornecedor),
    parcela: str(t.numero_parcela),
    contaCorrente: str(t.id_conta_corrente),
  }
}

async function buscarTitulos(env) {
  const [pagar, receber] = await Promise.all([
    listarPaginado(env, 'financas/contapagar', 'ListarContasPagar', 'conta_pagar_cadastro'),
    listarPaginado(env, 'financas/contareceber', 'ListarContasReceber', 'conta_receber_cadastro'),
  ])
  return [...pagar.map((t) => mapearTitulo(t, 'P')), ...receber.map((t) => mapearTitulo(t, 'R'))]
}

async function gravarTitulos(env, chave, titulos) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/painel_estado`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ chave, dados: { titulos, geradoEm: new Date().toISOString() } }),
  })
}

// ── Orçamento de caixa (previsto × realizado por baixa) ─────────────────────
// ListarOrcamentos tem rate-limit agressivo (bloqueio por redundância): por sync,
// só mês atual + anterior, sequencial e espaçado. Histórico vem do backfill.
async function buscarOrcamentoMes(env, ano, mes) {
  const r = await omieCall(env, 'financas/caixa', 'ListarOrcamentos', { nAno: ano, nMes: mes })
  return (r.ListaOrcamentos ?? [])
    .filter((i) => str(i.cCodCateg).split('.').length >= 3)
    .map((i) => ({
      categoria: str(i.cCodCateg),
      previstoCentavos: Math.round(num(i.nValorPrevisto) * 100),
      realizadoCentavos: Math.round(num(i.nValorRealizado) * 100),
    }))
    .filter((i) => i.previstoCentavos !== 0 || i.realizadoCentavos !== 0)
}

// Mês anterior (fecha baixas da virada) + ano corrente inteiro: o BPO pode preencher o
// previsto de QUALQUER mês do ano na Omie — todos entram no app no sync seguinte.
function mesesOrcamento() {
  const hoje = new Date()
  const ano = hoje.getUTCFullYear()
  const mes = hoje.getUTCMonth() + 1
  const lista = [mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 }]
  for (let m = 1; m <= 12; m++) lista.push({ ano, mes: m })
  return lista
}

async function gravarOrcamento(env, chave, meses) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/painel_estado`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ chave, dados: { meses, geradoEm: new Date().toISOString() } }),
  })
}

// Best-effort, roda em segundo plano (waitUntil): falha nunca derruba o sync principal.
// ~13 chamadas espaçadas (rate-limit Omie) ≈ 4,5 min — grava progresso a cada mês.
async function atualizarOrcamento(env, chave) {
  try {
    const doc = (await lerDados(env, chave)) ?? { meses: {} }
    const meses = { ...(doc.meses ?? {}) }
    for (const { ano, mes } of mesesOrcamento()) {
      meses[`${ano}-${String(mes).padStart(2, '0')}`] = await buscarOrcamentoMes(env, ano, mes)
      await gravarOrcamento(env, chave, meses)
      await espera(21000)
    }
    return true
  } catch (_e) {
    return false
  }
}

async function gravarCadastros(env, chave, cadastros) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/painel_estado`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ chave, dados: { ...cadastros, geradoEm: new Date().toISOString() } }),
  })
}

// ── Credenciais POR CLIENTE, ciente do PROVEDOR (omie | nibo) ─────────────────
// painel_credenciais é service-role-only (RLS sem policies). SEM fallback de env:
// cliente sem credencial PRÓPRIA não sincroniza (erro claro). Devolve { provedor, env }
// — o env carrega só os segredos do provedor daquele cliente.
async function credenciaisDoCliente(env, clienteId) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/painel_credenciais?client_id=eq.${encodeURIComponent(clienteId)}&select=provedor,omie_app_key,omie_app_secret,omie_base_url,api_token,api_base_url`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  })
  const rows = await res.json()
  const c = Array.isArray(rows) ? rows[0] : null
  if (!c) throw new Error('Cliente sem credenciais configuradas — cadastre em painel_credenciais antes de sincronizar.')
  const provedor = c.provedor || 'omie'
  if (provedor === 'omie') {
    if (!c.omie_app_key || !c.omie_app_secret) throw new Error('Credencial Omie incompleta (app_key/app_secret).')
    return { provedor, env: { ...env, OMIE_APP_KEY: c.omie_app_key, OMIE_APP_SECRET: c.omie_app_secret, OMIE_BASE_URL: c.omie_base_url || env.OMIE_BASE_URL } }
  }
  // nibo: credencial é só o apitoken (escopo organização). Adapter pendente (Fase 2).
  if (!c.api_token) throw new Error('Credencial NIBO incompleta (api_token).')
  return { provedor, env: { ...env, NIBO_APITOKEN: c.api_token, NIBO_BASE_URL: c.api_base_url || 'https://api.nibo.com.br/empresas/v1' } }
}

// Contrato do adapter de provedor (a ser implementado por NIBO na Fase 2): cada provedor
// expõe buscarOmie/buscarCadastros/buscarTitulos equivalentes que devolvem a MESMA forma
// canônica (Movimento + cadastros + Titulo). O resto do handler não muda de provedor.
function naoImplementado(provedor) {
  return new Response(
    JSON.stringify({ error: `Provedor '${provedor}' reconhecido, mas o adapter ainda não foi implementado (Fase 2 — falta token + verificação da API).` }),
    { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } },
  )
}

async function lerDados(env, chave) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/painel_estado?chave=eq.${encodeURIComponent(chave)}&select=dados`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  })
  const rows = await res.json()
  return rows?.[0]?.dados ?? null
}

async function lerDoc(env, chave) {
  return (await lerDados(env, chave))?.movimentos ?? []
}

async function gravarHistorico(env, chave, entrada) {
  const entradas = (await lerDados(env, chave))?.entradas ?? []
  await fetch(`${env.SUPABASE_URL}/rest/v1/painel_estado`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ chave, dados: { entradas: [entrada, ...entradas].slice(0, HIST_MAX) } }),
  })
}

async function gravarDoc(env, chave, movimentos) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/painel_estado`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ chave, dados: { movimentos, geradoEm: new Date().toISOString() } }),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const env = Deno.env.toObject()
    const { clienteId, desde } = await req.json()
    if (!clienteId) throw new Error('clienteId obrigatório')
    const chave = `cliente:${clienteId}:movimentos-raw`
    const chaveCad = `cliente:${clienteId}:cadastros-raw`
    const chaveHist = `cliente:${clienteId}:sync-historico`
    const chaveOrc = `cliente:${clienteId}:orcamento-raw`
    const chaveTit = `cliente:${clienteId}:titulos-raw`
    let cred
    try { cred = await credenciaisDoCliente(env, clienteId) }
    catch (e) {
      // 200 com payload de erro: o supabase-js engole o corpo de respostas non-2xx.
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'credenciais' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    // Seam multi-provedor: Omie segue o caminho abaixo; NIBO é reconhecido e recusado
    // limpo até o adapter existir (fail-closed — nunca grava lixo no painel_estado).
    if (cred.provedor !== 'omie') return naoImplementado(cred.provedor)
    const envOmie = cred.env
    const [atuais, brutos, cadastros, titulos] = await Promise.all([
      lerDoc(env, chave), buscarOmie(envOmie), buscarCadastros(envOmie), buscarTitulos(envOmie),
    ])
    const recebidosTodos = await enriquecerDepartamentos(envOmie, brutos)
    // Piso de ingestão opcional (ISO 'aaaa-mm-dd'): só grava movimentos a partir desta data.
    // Sem `desde`, comportamento inalterado (outros clientes não são afetados).
    const isoBR = (s: string) => { const p = (s || '').split('/'); return p.length === 3 ? `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}` : '' }
    const recebidos = desde
      ? recebidosTodos.filter((m) => { const iso = isoBR(m.data); return !iso || iso >= desde })
      : recebidosTodos
    const d = diffDetalhado(atuais, recebidos)
    const entrada = entradaHistorico(d, recebidos.length, atuais.length === 0)
    await Promise.all([
      gravarDoc(env, chave, recebidos),
      gravarCadastros(env, chaveCad, cadastros),
      gravarTitulos(env, chaveTit, titulos),
      gravarHistorico(env, chaveHist, entrada),
    ])
    // Orçamento continua em background após a resposta (rate-limit exige ~4,5 min).
    const tarefaOrcamento = atualizarOrcamento(envOmie, chaveOrc)
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(tarefaOrcamento)
    else await tarefaOrcamento
    return new Response(
      JSON.stringify({
        novos: d.novos.length, atualizados: d.atualizados.length, removidos: d.removidos.length, total: recebidos.length,
        cadastros: { categorias: cadastros.categorias.length, clientes: Object.keys(cadastros.clientes).length, departamentos: cadastros.departamentos.length },
        titulos: titulos.length,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'erro' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
