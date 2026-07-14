/**
 * @file Resolução de filial por movimento e agregação receitas/despesas por filial.
 * Precedência: rateio real da Omie (puxado automaticamente no sync via LancCC)
 * > seleção manual POR MOVIMENTO feita no detalhamento > sem filial. Nada é
 * distribuído por estimativa — o que não tem dono aparece como "Sem filial".
 */
import { idDep, SEM_FILIAL } from './centros'
import { codigoContraparte } from './cliente'
import type { Conciliacao } from './modelo'
import type { Movimento } from './movimento'
import { normalizarTexto } from './texto'

/** Identidade estável do movimento p/ a atribuição manual (mapa da dimensão centros). */
export function chaveMovFilial(m: Movimento): string {
  if (m.idMovCC) return `cc:${m.idMovCC}`
  if (m.idTitulo && m.idTitulo !== '0') return `t:${m.idTitulo}|${m.parcela}`
  return `x:${m.documento}|${m.contaCorrente}|${m.data}|${m.valorCentavos}`
}

/** Filial atribuída automaticamente pelo rateio Omie (null = sem rateio lá). */
export function filialOmie(m: Movimento, centros: Conciliacao): string | null {
  if (!m.departamento) return null
  const id = idDep(m.departamento)
  return centros.estrutura.some((n) => n.id === id) ? id : null
}

/** Atribuição explícita (rateio Omie ou seleção manual) — base da herança automática. */
export function filialDoMovimento(m: Movimento, centros: Conciliacao): string | null {
  return filialOmie(m, centros) ?? centros.mapa[chaveMovFilial(m)] ?? null
}

export type OrigemFilial = 'omie' | 'manual' | 'auto'

export interface FilialResolvida {
  readonly noId: string
  readonly origem: OrigemFilial
}

/**
 * Filial predominante por contraparte, derivada SÓ das atribuições explícitas
 * (rateio Omie + manuais). É a fonte da herança automática: um movimento marcado
 * espalha o default para os irmãos da mesma contraparte. 'sem_filial' não propaga.
 */
export function autoPorContraparte(
  movs: readonly Movimento[],
  centros: Conciliacao,
): Map<string, string> {
  const contagem = new Map<string, Map<string, number>>()
  for (const m of movs) {
    // Sem contraparte não há parentesco — herdar aqui espalharia 1 marcação a todos os órfãos.
    // codigoContraparte: o GUID nulo Nibo é truthy e agruparia todos os órfãos como UMA contraparte.
    const cod = codigoContraparte(m.contraparteCodigo)
    if (!cod) continue
    const id = filialDoMovimento(m, centros)
    if (!id || id === SEM_FILIAL.id) continue
    const porFilial = contagem.get(cod) ?? new Map<string, number>()
    porFilial.set(id, (porFilial.get(id) ?? 0) + 1)
    contagem.set(cod, porFilial)
  }
  return new Map([...contagem].map(([c, porFilial]) => [c, predominante(porFilial)]))
}

function predominante(porFilial: ReadonlyMap<string, number>): string {
  return [...porFilial].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? ''
}

/**
 * Contraparte cujo NOME é idêntico (ou prefixo exato) ao nome de uma filial → herda sem
 * marcação nenhuma (ex.: cliente "EMBASA" → filial "Embasa"). Igualdade/prefixo apenas:
 * conter a palavra não basta ("MMC ENGENHARIA" NÃO casa com a filial "Engenharia").
 */
export function autoPorNome(
  nomesContrapartes: ReadonlyMap<string, string>,
  centros: Conciliacao,
): Map<string, string> {
  const filiais = centros.estrutura
    .filter((n) => n.id !== SEM_FILIAL.id)
    .map((n) => ({ id: n.id, alvo: normalizarTexto(n.nome) }))
    .filter((f) => f.alvo.length >= 4)
  const out = new Map<string, string>()
  for (const [codigo, nome] of nomesContrapartes) {
    const n = normalizarTexto(nome)
    const hit = filiais.find((f) => n === f.alvo || n.startsWith(`${f.alvo} `))
    if (hit) out.set(codigo, hit.id)
  }
  return out
}

/** Mapa de herança combinado — marcação explícita da contraparte vence o casamento por nome. */
export function mapaAuto(
  movs: readonly Movimento[],
  centros: Conciliacao,
  nomesContrapartes: ReadonlyMap<string, string>,
): Map<string, string> {
  return new Map([...autoPorNome(nomesContrapartes, centros), ...autoPorContraparte(movs, centros)])
}

/** Cascata completa: Omie > manual > herdada da contraparte > null. */
export function resolverFilial(
  m: Movimento,
  centros: Conciliacao,
  auto: ReadonlyMap<string, string>,
): FilialResolvida | null {
  const omie = filialOmie(m, centros)
  if (omie) return { noId: omie, origem: 'omie' }
  const manual = centros.mapa[chaveMovFilial(m)]
  if (manual) return { noId: manual, origem: 'manual' }
  const cod = codigoContraparte(m.contraparteCodigo)
  const herdada = cod ? auto.get(cod) : undefined
  return herdada ? { noId: herdada, origem: 'auto' } : null
}

/** null = todas; 'sem_filial' = só o não-atribuído (auditoria). */
export type FiltroFilial = string | null

export interface FiltroFilialResultado {
  readonly dentro: readonly Movimento[]
  readonly fora: number
}

/** Filtra movimentos pela filial resolvida (mesma cascata exibida no detalhamento). */
export function filtrarPorFilial(
  movs: readonly Movimento[],
  filtro: FiltroFilial,
  centros: Conciliacao,
  auto: ReadonlyMap<string, string>,
): FiltroFilialResultado {
  if (filtro === null) return { dentro: movs, fora: 0 }
  const dentro = movs.filter((m) => {
    const id = resolverFilial(m, centros, auto)?.noId ?? null
    if (filtro === SEM_FILIAL.id) return id === null || id === SEM_FILIAL.id
    return id === filtro
  })
  return { dentro, fora: movs.length - dentro.length }
}

export interface LinhaFilial {
  readonly noId: string
  readonly nome: string
  readonly entradasCentavos: number
  readonly saidasCentavos: number
  readonly resultadoCentavos: number
  readonly qtd: number
}

export interface ResultadoFiliais {
  readonly linhas: readonly LinhaFilial[]
  readonly semFilial: LinhaFilial
}

interface Acum {
  e: number
  s: number
  q: number
}

/**
 * Entradas/saídas separadas por filial (sinal pela natureza R/P, critério de lib/resultado).
 * Usa a cascata completa — inclui a herança automática por contraparte.
 */
export function resultadoPorFilial(
  movs: readonly Movimento[],
  centros: Conciliacao,
  nomesContrapartes: ReadonlyMap<string, string> = new Map(),
): ResultadoFiliais {
  const nomes = new Map(centros.estrutura.map((n) => [n.id, n.nome]))
  const auto = mapaAuto(movs, centros, nomesContrapartes)
  const porFilial = new Map<string, Acum>()
  const sem: Acum = { e: 0, s: 0, q: 0 }
  for (const m of movs) {
    acumular(balde(m, centros, auto, nomes, porFilial, sem), m)
  }
  const linhas = [...porFilial]
    .map(([noId, a]) => linha(noId, nomes.get(noId) ?? noId, a))
    .sort((a, b) => b.entradasCentavos - a.entradasCentavos || a.saidasCentavos - b.saidasCentavos)
  return { linhas, semFilial: linha(SEM_FILIAL.id, SEM_FILIAL.nome, sem) }
}

function balde(
  m: Movimento,
  centros: Conciliacao,
  auto: ReadonlyMap<string, string>,
  nomes: ReadonlyMap<string, string>,
  porFilial: Map<string, Acum>,
  sem: Acum,
): Acum {
  const r = resolverFilial(m, centros, auto)
  if (!r || r.noId === SEM_FILIAL.id || !nomes.has(r.noId)) return sem
  const atual = porFilial.get(r.noId)
  if (atual) return atual
  const novo: Acum = { e: 0, s: 0, q: 0 }
  porFilial.set(r.noId, novo)
  return novo
}

function acumular(a: Acum, m: Movimento): void {
  if (m.natureza.toUpperCase() === 'R') a.e += m.valorCentavos
  else a.s += m.valorCentavos
  a.q += 1
}

function linha(noId: string, nome: string, a: Acum): LinhaFilial {
  return {
    noId,
    nome,
    entradasCentavos: a.e,
    saidasCentavos: a.s,
    resultadoCentavos: a.e - a.s,
    qtd: a.q,
  }
}
