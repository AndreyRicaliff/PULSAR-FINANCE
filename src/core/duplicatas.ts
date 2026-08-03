/**
 * @file Detecção de duplicatas — contas (contrapartes/categorias com o MESMO nome
 * normalizado em códigos distintos: "embalagens" × "EMBALAGENS") e registros (lançamento
 * manual repetido ou colidindo com movimento do ERP). Núcleo puro; quem decide fundir,
 * ignorar ou recolocar é SEMPRE o operador — detecção nunca aplica nada sozinha (mesma
 * filosofia da Matriz de Classificações).
 */
import type { EstadoRegistro } from './estadoRegistro'
import { ehManual } from './lancamento'
import type { Movimento } from './movimento'
import { normalizarTexto } from './texto'

export interface MembroDuplicata {
  readonly codigo: string
  /** Nome resolvido LIMPO (pós-override, sem etiqueta de estado). */
  readonly nome: string
  readonly estado?: EstadoRegistro
  readonly totalCentavos: number
  readonly qtd: number
}

export interface GrupoDuplicado {
  /** Identidade do grupo: códigos-membro ordenados — estável a renomes. */
  readonly chave: string
  /** Nome normalizado que uniu o grupo. */
  readonly nomeComum: string
  readonly membros: readonly MembroDuplicata[]
}

/** Identidade estável de um grupo (pra marcar "não é duplicata"). */
export function chaveGrupo(codigos: readonly string[]): string {
  return [...codigos].sort().join('|')
}

/** Agrupa entidades cujo nome limpo normalizado colide em ≥2 códigos distintos. */
export function gruposDuplicados(
  membros: readonly MembroDuplicata[],
  ignoradas: ReadonlySet<string> = new Set(),
): GrupoDuplicado[] {
  const porNome = new Map<string, MembroDuplicata[]>()
  for (const m of membros) {
    const chave = normalizarTexto(m.nome)
    if (!chave) continue
    porNome.set(chave, [...(porNome.get(chave) ?? []), m])
  }
  return [...porNome.entries()]
    .filter(([, ms]) => ms.length > 1)
    .map(([nomeComum, ms]) => ({
      chave: chaveGrupo(ms.map((m) => m.codigo)),
      nomeComum,
      membros: [...ms].sort((a, b) => Math.abs(b.totalCentavos) - Math.abs(a.totalCentavos)),
    }))
    .filter((g) => !ignoradas.has(g.chave))
    .sort((a, b) => somaAbs(b.membros) - somaAbs(a.membros))
}

const somaAbs = (ms: readonly MembroDuplicata[]): number => ms.reduce((s, m) => s + Math.abs(m.totalCentavos), 0)

/** Doc por tenant (padrão painel_estado): grupos que o operador marcou como legítimos. */
export interface DocDuplicatas {
  readonly ignoradas: readonly string[]
}

export const DUPLICATAS_VAZIO: DocDuplicatas = { ignoradas: [] }

export function normalizarDuplicatas(bruto: unknown): DocDuplicatas {
  const d = (bruto ?? {}) as Partial<DocDuplicatas>
  return { ignoradas: Array.isArray(d.ignoradas) ? d.ignoradas.filter((x): x is string => typeof x === 'string') : [] }
}

// ── Registros (lançamento manual × existentes) ─────────────────────────────────────────

export interface CandidatoLancamento {
  /** ISO aaaa-mm-dd (formato do input date). */
  readonly dataIso: string
  readonly valorCentavos: number
  readonly natureza: 'R' | 'P'
  /** id do próprio lançamento quando é EDIÇÃO (não compara consigo mesmo). */
  readonly ignorarId?: string
}

export interface SuspeitaDuplicata {
  readonly tipo: 'manual' | 'erp'
  readonly movimento: Movimento
}

/** Janela de datas do casamento heurístico manual×ERP (repasse não cai no mesmo dia). */
const JANELA_DIAS_ERP = 3

/**
 * Suspeitas de duplicata pra um lançamento manual: manual×manual = mesma data, valor e
 * natureza (duplo-clique/re-cadastro); manual×ERP = mesmo valor (pago, senão cheio) e
 * natureza numa janela de ±3 dias — não há chave comum entre as fontes, o casamento é
 * heurístico e por isso vira CONFIRMAÇÃO, nunca bloqueio.
 */
export function suspeitasDoLancamento(cand: CandidatoLancamento, movimentos: readonly Movimento[]): SuspeitaDuplicata[] {
  const alvo = diasDesdeEpoca(cand.dataIso)
  if (alvo === null) return []
  const suspeitas: SuspeitaDuplicata[] = []
  for (const m of movimentos) {
    if (m.natureza.toUpperCase() !== cand.natureza) continue
    if (ehManual(m)) {
      if (cand.ignorarId && m.idTitulo === `manual:${cand.ignorarId}`) continue
      const dia = diasDesdeEpoca(m.data)
      if (dia !== null && dia === alvo && m.valorCentavos === cand.valorCentavos) suspeitas.push({ tipo: 'manual', movimento: m })
      continue
    }
    const valorErp = m.valorPagoCentavos > 0 ? m.valorPagoCentavos : m.valorCentavos
    if (valorErp !== cand.valorCentavos) continue
    const dia = diasDesdeEpoca(m.dataPagamento ?? m.data)
    if (dia !== null && Math.abs(dia - alvo) <= JANELA_DIAS_ERP) suspeitas.push({ tipo: 'erp', movimento: m })
  }
  return suspeitas
}

/** Aceita 'aaaa-mm-dd' e 'dd/mm/aaaa'; null quando não é data. */
function diasDesdeEpoca(data: string): number | null {
  let iso = data
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data)
  if (br) iso = `${br[3]}-${br[2]}-${br[1]}`
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return null
  const t = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(t) ? null : Math.floor(t / 86_400_000)
}
