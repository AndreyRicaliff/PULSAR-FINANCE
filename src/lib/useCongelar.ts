/**
 * @file Fotografa os números de UM intervalo — o da apresentação, não o do filtro global.
 *
 * Existe separado do `useResultado` porque este calcula sempre o período ATIVO na tela. Ao
 * publicar o fechamento de julho em agosto, congelar o que está na tela gravaria agosto na
 * apresentação de julho. O intervalo entra por parâmetro justamente para isso.
 */
import { useCallback } from 'react'
import { totaisEfetivos } from '@/core/classes'
import { congelar, type NumerosCongelados } from '@/core/congelamento'
import { calcular, type Demonstracao } from '@/core/demonstracao'
import { movimentosCaixa, type Movimento } from '@/core/movimento'
import { separarNeutros } from '@/core/neutros'
import { filtrarPorPeriodo, type Intervalo, type Regime } from '@/core/periodo'
import { useCadastros } from './cadastros'
import { useMovimentos } from './movimentos'
import { useDemonstracoes } from './useDemonstracoes'
import { useModelo } from './useModelo'

export function useCongelar(): (intervalo: Intervalo, regime: Regime) => NumerosCongelados {
  const { modelo } = useModelo()
  const dem = useDemonstracoes()
  const { movimentos: todos } = useMovimentos()
  const { categorias } = useCadastros()

  return useCallback(
    (intervalo: Intervalo, regime: Regime) => {
      const conc = modelo.contas
      const cats = categorias.categorias
      // Mesma cadeia do pipeline da tela: período → neutros fora → totais efetivos → linhas.
      // Reusar é o que garante que a foto bate com o que o operador viu antes de publicar.
      const noPeriodo = filtrarPorPeriodo(todos, intervalo, regime).dentro
      const { operacionais } = separarNeutros(noPeriodo, conc)
      const linhas = (movs: readonly Movimento[], demo: Demonstracao, tipo: 'dre' | 'dfc') => {
        const ef = totaisEfetivos(movs, conc, cats, demo, tipo)
        return calcular({ linhas: demo.linhas, mapa: ef.mapaEfetivo }, ef.totalPorChave)
      }
      return congelar({
        dre: linhas(operacionais, dem.demo.dre, 'dre'),
        dfc: linhas(movimentosCaixa(operacionais), dem.demo.dfc, 'dfc'),
        intervalo,
        regime,
        movimentos: operacionais.length,
        agoraIso: new Date().toISOString(),
      })
    },
    [modelo.contas, categorias.categorias, todos, dem.demo.dre, dem.demo.dfc],
  )
}
