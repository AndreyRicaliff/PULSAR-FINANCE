/** @file Indicadores-chave derivados da DRE/DFC configurada + gráficos (sparkline mensal por card). */
import { useMemo } from 'react'
import { calcularIndicadores, seriesDosIndicadores } from '@/lib/indicadores'
import { useSomenteLeitura } from '@/lib/somenteLeitura'
import { useCadastros } from '@/lib/cadastros'
import { useDemonstracoes } from '@/lib/useDemonstracoes'
import { useResultado } from '@/lib/useResultado'
import { GraficosView } from './GraficosView.tsx'
import { KpiCard } from './KpiCard.tsx'

/** resumo = só os cards de indicadores (sem os gráficos), p/ o slide de Indicadores não repetir gráficos. */
export function IndicadoresPanel({ resumo = false }: { resumo?: boolean } = {}) {
  const somenteLeitura = useSomenteLeitura()
  const { grupos, dre, dfc, movimentos: movs, conc, periodo, anterior } = useResultado()
  const dem = useDemonstracoes()
  const { categorias } = useCadastros()
  const indicadores = useMemo(
    () => calcularIndicadores(dre, dfc, grupos, anterior ?? undefined),
    [dre, dfc, grupos, anterior],
  )
  const series = useMemo(
    () => seriesDosIndicadores(movs, conc, dem.demo.dre, dem.demo.dfc, periodo.regime, categorias.categorias),
    [movs, conc, dem.demo.dre, dem.demo.dfc, periodo.regime, categorias],
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Duas línguas: o operador precisa saber DE ONDE vem cada número (e como editar);
          o cliente precisa saber o que o número significa. "Editar DRE/DFC" e "conciliar"
          são instruções de uma tela que ele nem enxerga. */}
      <header>
        <h1 className="text-[19px] font-semibold">{somenteLeitura ? 'Seus números' : 'Indicadores & Gráficos'}</h1>
        <p className="text-sm text-muted">
          {somenteLeitura ? (
            <>Os principais indicadores do período · transferências entre suas contas ficam de fora</>
          ) : (
            <>
              Derivados da DRE/DFC <strong>configurada</strong> em "Editar DRE/DFC" · cada indicador aponta
              sua fórmula · neutros e não conciliados ficam de fora
            </>
          )}
        </p>
      </header>

      {grupos.length === 0 ? (
        <p className="rounded-card border border-dashed border-bd p-8 text-center text-muted">
          {somenteLeitura
            ? 'Seus números aparecem aqui assim que a classificação das contas for concluída pela nossa equipe.'
            : 'Nada conciliado ainda — concilie em "Matriz de Classificações" para os indicadores aparecerem.'}
        </p>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {indicadores.map((i) => (
              <KpiCard key={i.nome} rotulo={i.nome} valor={i.valor} cor={i.cor} nota={i.formula} serie={series.get(i.nome)} tendencia={i.tendencia} />
            ))}
          </section>
          {resumo ? null : <GraficosView grupos={grupos} movimentos={movs} conc={conc} />}
        </>
      )}
    </div>
  )
}
