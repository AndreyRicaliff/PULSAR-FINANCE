/** @file Grade de gráficos derivados dos grupos conciliados (rosca, barras, waterfall). */
import { useMemo } from 'react'
import type { Conciliacao } from '@/core/modelo'
import type { Movimento } from '@/core/movimento'
import { composicaoDespesas, gruposPorValor, movimentacaoMensal } from '@/lib/graficos'
import type { GrupoEspelho } from '@/lib/resultado'
import { BarrasH } from './charts/BarrasH.tsx'
import { BarrasMensais } from './charts/BarrasMensais.tsx'
import { Donut } from './charts/Donut.tsx'
import { GraficoExpansivel } from './charts/GraficoExpansivel.tsx'

interface Props {
  readonly grupos: readonly GrupoEspelho[]
  readonly movimentos: readonly Movimento[]
  readonly conc: Conciliacao
}

export function GraficosView({ grupos, movimentos, conc }: Props) {
  const despesas = useMemo(() => composicaoDespesas(grupos), [grupos])
  const porValor = useMemo(() => gruposPorValor(grupos), [grupos])
  const mensal = useMemo(() => movimentacaoMensal(movimentos, conc), [movimentos, conc])

  if (grupos.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-bd p-8 text-center text-muted">
        Nada conciliado ainda — concilie em "Matriz de Classificações" para os gráficos aparecerem.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <GraficoExpansivel titulo="Movimentação mensal (entradas × saídas)">
        <BarrasMensais dados={mensal} />
      </GraficoExpansivel>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GraficoExpansivel
          titulo="Composição das despesas"
          grande={<Donut fatias={despesas} tamanho={340} />}
          ampliarSvg={false}
        >
          <Donut fatias={despesas} />
        </GraficoExpansivel>
        <GraficoExpansivel titulo="Grupos por valor">
          <BarrasH itens={porValor} />
        </GraficoExpansivel>
      </div>
    </div>
  )
}
