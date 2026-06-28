/** @file Barras mensais entrada×saída — SVG puro, tokens AG, tooltip rico (Δ vs mês anterior). */
import type { BarraMes } from '@/lib/graficos'
import { brl, fracVariacao, pctVariacao } from '@/lib/money'
import { TipLinha, TipTitulo, useTooltipGrafico, type TooltipGrafico } from '@/lib/tooltipGrafico'

// Geometria das colunas: barras h-44 (176px) + gap-1 (4px) + rótulo ~15px + pb-1 (4px).
const ALTURA_BARRAS_PX = 176
const BASE_RODAPE_PX = 23

export function BarrasMensais({ dados }: { dados: readonly BarraMes[] }) {
  const tip = useTooltipGrafico()
  if (dados.length === 0) return <p className="text-sm text-muted">Sem movimentação datada.</p>
  const max = Math.max(1, ...dados.flatMap((d) => [d.entrada, d.saida]))
  const mediaEntrada = dados.reduce((s, d) => s + d.entrada, 0) / dados.length
  const mediaSaida = dados.reduce((s, d) => s + d.saida, 0) / dados.length
  return (
    <div className="flex flex-col gap-3">
      <Legenda mediaEntrada={mediaEntrada} mediaSaida={mediaSaida} />
      <div className="relative">
        <LinhaMedia valor={mediaEntrada} max={max} classe="border-accent/70" rotulo="Média de entradas" tip={tip} />
        <LinhaMedia valor={mediaSaida} max={max} classe="border-danger/70" rotulo="Média de saídas" tip={tip} />
        <div className="flex h-56 items-end gap-3 overflow-x-auto pb-1">
          {dados.map((d, i) => (
            <Coluna key={d.mes} dado={d} anterior={dados[i - 1]} max={max} tip={tip} indice={i} />
          ))}
        </div>
      </div>
      {tip.tooltip}
    </div>
  )
}

interface PropsLinhaMedia {
  readonly valor: number
  readonly max: number
  readonly classe: string
  readonly rotulo: string
  readonly tip: TooltipGrafico
}

function LinhaMedia({ valor, max, classe, rotulo, tip }: PropsLinhaMedia) {
  return (
    <div
      onMouseMove={(e) => tip.mostrar(e, <TipLinha rotulo={rotulo} valor={brl(valor)} />)}
      onMouseLeave={tip.esconder}
      className={`pointer-events-auto absolute left-0 right-0 z-10 border-t border-dashed ${classe}`}
      style={{ bottom: `${BASE_RODAPE_PX + (valor / max) * ALTURA_BARRAS_PX}px` }}
    />
  )
}

interface PropsColuna {
  readonly dado: BarraMes
  readonly anterior?: BarraMes
  readonly max: number
  readonly tip: TooltipGrafico
  readonly indice: number
}

function Coluna({ dado, anterior, max, tip, indice }: PropsColuna) {
  const saldo = dado.entrada - dado.saida
  const conteudo = (
    <>
      <TipTitulo>{dado.mes}</TipTitulo>
      <TipLinha rotulo="Entradas" valor={brl(dado.entrada)} classe="text-accent" />
      {anterior ? <TipLinha rotulo="· vs mês anterior" valor={pctVariacao(fracVariacao(dado.entrada, anterior.entrada))} /> : null}
      <TipLinha rotulo="Saídas" valor={brl(dado.saida)} classe="text-danger" />
      {anterior ? <TipLinha rotulo="· vs mês anterior" valor={pctVariacao(fracVariacao(dado.saida, anterior.saida))} /> : null}
      <TipLinha rotulo="Saldo" valor={brl(saldo)} classe={saldo < 0 ? 'text-danger' : 'text-accent'} />
    </>
  )
  return (
    <div
      className="group flex shrink-0 flex-col items-center gap-1"
      onMouseMove={(e) => tip.mostrar(e, conteudo)}
      onMouseLeave={tip.esconder}
    >
      <div className="flex h-44 items-end gap-0.5">
        <div
          className="anim-grow-y w-3 rounded-t bg-gradient-to-t from-accent/50 to-accent transition-opacity duration-200 group-hover:opacity-80"
          style={{ height: `${(dado.entrada / max) * 100}%`, animationDelay: `${indice * 0.04}s` }}
        />
        <div
          className="anim-grow-y w-3 rounded-t bg-gradient-to-t from-danger/50 to-danger transition-opacity duration-200 group-hover:opacity-80"
          style={{ height: `${(dado.saida / max) * 100}%`, animationDelay: `${indice * 0.04}s` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted transition-colors group-hover:text-text">{dado.mes}</span>
    </div>
  )
}

function Legenda({ mediaEntrada, mediaSaida }: { mediaEntrada: number; mediaSaida: number }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-accent" /> Entradas
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-danger" /> Saídas
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 border-t border-dashed border-accent/70" /> média {brl(mediaEntrada)}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 border-t border-dashed border-danger/70" /> média {brl(mediaSaida)}
      </span>
    </div>
  )
}
