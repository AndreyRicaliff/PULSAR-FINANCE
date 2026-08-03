/**
 * @file Demonstrações calculadas para janelas arbitrárias pelo MESMO pipeline do resultado
 * (período → espelho → DRE/DFC) — base do comparativo lado a lado e do mês corrente.
 */
import { useMemo } from 'react'
import { CHAVE_CLASSE, CHAVE_SUB, totaisEfetivos } from '@/core/classes'
import { calcular, type Demonstracao, type LinhaCalc } from '@/core/demonstracao'
import { filtrarPorFilial, mapaAuto } from '@/core/filial'
import { movimentosCaixa, type Movimento } from '@/core/movimento'
import { dataDoMovimento, filtrarPorPeriodo, hojeLocalIso, intervaloDoPreset, mesesDoIntervalo, type Intervalo, type Regime } from '@/core/periodo'
import { useCadastros } from './cadastros'
import { separarNeutros } from '@/core/neutros'
import { useMovimentos } from './movimentos'
import { usePeriodoOpcional } from './periodo'
import { espelhoEstrutura, type GrupoEspelho } from './resultado'
import { totaisDe, type TotaisMov } from './totais'
import { useDemonstracoes } from './useDemonstracoes'
import { useModelo } from './useModelo'

export interface MesAtual {
  readonly dre: readonly LinhaCalc[]
  readonly dfc: readonly LinhaCalc[]
  readonly intervalo: Intervalo
  readonly qtd: number
}

export interface LadoDemonstracoes {
  readonly dre: readonly LinhaCalc[]
  readonly dfc: readonly LinhaCalc[]
  readonly espelho: readonly GrupoEspelho[]
  readonly totais: TotaisMov
}

/** DRE/DFC + espelho de uma janela arbitrária (sem filial — visão geral do comparativo). */
export function useDemonstracoesDe(intervalo: Intervalo, regime: Regime): LadoDemonstracoes {
  const { modelo } = useModelo()
  const dem = useDemonstracoes()
  const { movimentos: todos } = useMovimentos()
  const { categorias } = useCadastros()
  const conc = modelo.contas
  const cats = categorias.categorias

  return useMemo(() => {
    const movs = filtrarPorPeriodo(todos, intervalo, regime).dentro
    const espelho = espelhoEstrutura(movs, conc)
    const ef = (movsArg: typeof movs, demo: Demonstracao, tipo: 'dre' | 'dfc') => {
      const e = totaisEfetivos(movsArg, conc, cats, demo, tipo)
      return calcular({ linhas: demo.linhas, mapa: e.mapaEfetivo }, e.totalPorChave)
    }
    return {
      dre: ef(movs, dem.demo.dre, 'dre'),
      dfc: ef(movimentosCaixa(movs), dem.demo.dfc, 'dfc'),
      espelho,
      totais: totaisDe(separarNeutros(movs, conc).operacionais),
    }
  }, [todos, intervalo, regime, conc, cats, dem.demo.dre, dem.demo.dfc])
}

/** DRE/DFC do mês corrente com regime e filial herdados do filtro ativo. */
export function useMesAtual(): MesAtual {
  const { modelo } = useModelo()
  const dem = useDemonstracoes()
  const { regime, filial } = usePeriodoOpcional()
  const { movimentos: todos } = useMovimentos()
  const { nomesContrapartes, categorias } = useCadastros()
  const conc = modelo.contas
  const cats = categorias.categorias

  return useMemo(() => {
    const intervalo = intervaloDoPreset('mes-atual', hojeLocalIso())
    const base = filtrarPorPeriodo(todos, intervalo, regime).dentro
    const auto = filial ? mapaAuto(todos, modelo.centros, nomesContrapartes) : new Map<string, string>()
    const movs = filtrarPorFilial(base, filial, modelo.centros, auto).dentro
    const ef = (movsArg: typeof movs, demo: Demonstracao, tipo: 'dre' | 'dfc') => {
      const e = totaisEfetivos(movsArg, conc, cats, demo, tipo)
      return calcular({ linhas: demo.linhas, mapa: e.mapaEfetivo }, e.totalPorChave)
    }
    return { dre: ef(movs, dem.demo.dre, 'dre'), dfc: ef(movimentosCaixa(movs), dem.demo.dfc, 'dfc'), intervalo, qtd: movs.length }
  }, [todos, regime, filial, modelo.centros, conc, cats, dem.demo.dre, dem.demo.dfc, nomesContrapartes])
}

/** Conta (chave efetiva) que compõe uma linha da demonstração num mês — base do drill da matriz. */
export interface ChaveMes {
  readonly chave: string
  readonly nome: string
  /** id da linha da demonstração onde a chave caiu (mapaEfetivo). */
  readonly linha: string
  readonly valorCentavos: number
}

export interface MesComparativo {
  readonly intervalo: Intervalo
  readonly dre: readonly LinhaCalc[]
  readonly dfc: readonly LinhaCalc[]
  readonly chavesDre: readonly ChaveMes[]
  readonly chavesDfc: readonly ChaveMes[]
}

/**
 * Um cálculo POR MÊS do intervalo, pelo mesmo pipeline do lado (nada de fórmula paralela —
 * a coluna Total e a soma dos meses saem da mesma fonte). Movido para fora do hook para
 * rodar N vezes num único useMemo sem violar regra de hooks.
 */
export function useMesesDe(intervalo: Intervalo, regime: Regime): readonly MesComparativo[] {
  const { modelo } = useModelo()
  const dem = useDemonstracoes()
  const { movimentos: todos } = useMovimentos()
  const { categorias } = useCadastros()
  const conc = modelo.contas
  const cats = categorias.categorias

  return useMemo(() => {
    // Nome legível da chave efetiva (grupo | sub:<id> | cls:<código>) — pro drill da matriz.
    const noPorId = new Map(conc.estrutura.map((n) => [n.id, n]))
    const catPorCodigo = new Map(cats.map((c) => [c.codigo, c]))
    const nomeChave = (chave: string): string => {
      if (chave.startsWith(CHAVE_SUB)) return noPorId.get(chave.slice(CHAVE_SUB.length))?.nome ?? chave
      if (chave.startsWith(CHAVE_CLASSE)) {
        const cod = chave.slice(CHAVE_CLASSE.length)
        return catPorCodigo.get(cod)?.descricao ?? cod
      }
      return noPorId.get(chave)?.nome ?? chave
    }
    const calcJanela = (jan: Intervalo, demo: Demonstracao, tipo: 'dre' | 'dfc') => {
      const movs = filtrarPorPeriodo(todos, jan, regime).dentro
      const base = tipo === 'dfc' ? movimentosCaixa(movs) : movs
      const e = totaisEfetivos(base, conc, cats, demo, tipo)
      const linhas = calcular({ linhas: demo.linhas, mapa: e.mapaEfetivo }, e.totalPorChave)
      const chaves = Object.entries(e.mapaEfetivo)
        .map(([chave, linha]) => ({ chave, nome: nomeChave(chave), linha, valorCentavos: e.totalPorChave.get(chave) ?? 0 }))
        .filter((c) => c.valorCentavos !== 0)
      return { linhas, chaves }
    }
    // 'Todo o histórico' não tem bordas e mesesDoIntervalo devolve [] — o toggle "Mês a mês"
    // sumia justamente no preset mais usado (report 02/08). Fallback: enumerar os meses
    // PRESENTES no dado, clipados ao que houver de borda.
    const janelas = mesesDoIntervalo(intervalo)
    const meses = janelas.length > 0 ? janelas : mesesDoDado(todos, regime, intervalo)
    return meses.map((jan) => {
      const d = calcJanela(jan, dem.demo.dre, 'dre')
      const f = calcJanela(jan, dem.demo.dfc, 'dfc')
      return { intervalo: jan, dre: d.linhas, dfc: f.linhas, chavesDre: d.chaves, chavesDfc: f.chaves }
    })
  }, [todos, intervalo, regime, conc, cats, dem.demo.dre, dem.demo.dfc])
}

/** Meses com movimento no regime, como intervalos mensais completos (sem teto — a tabela rola). */
function mesesDoDado(movs: readonly Movimento[], regime: Regime, bordas: Intervalo): Intervalo[] {
  const chaves = new Set<string>()
  for (const m of movs) {
    const iso = dataDoMovimento(m, regime)
    if (!iso) continue
    if (bordas.inicio && iso < bordas.inicio) continue
    if (bordas.fim && iso > bordas.fim) continue
    chaves.add(iso.slice(0, 7))
  }
  return [...chaves].sort().map((mes) => {
    const a = Number(mes.slice(0, 4))
    const mm = Number(mes.slice(5, 7))
    const ultimo = String(new Date(a, mm, 0).getDate()).padStart(2, '0')
    return { inicio: `${mes}-01`, fim: `${mes}-${ultimo}` }
  })
}
