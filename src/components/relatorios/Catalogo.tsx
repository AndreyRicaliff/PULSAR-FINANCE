/** @file Catálogo de relatórios: o que está disponível, parcial ou aguardando dado (honestidade primeiro). */
import type { VistaRel } from '../RelatoriosPanel.tsx'

type Status = 'ok' | 'planejado' | 'parcial' | 'requer'

interface Item {
  readonly titulo: string
  readonly desc: string
  readonly status: Status
  readonly abrir?: VistaRel
  readonly falta?: string
}

const ITENS: readonly Item[] = [
  { titulo: 'Dashboard', desc: 'Indicadores-chave e gráficos da DRE/DFC.', status: 'ok', abrir: 'dashboard' },
  { titulo: 'Comparativo de Períodos', desc: 'Mês atual lado a lado com o período selecionado — DRE e DFC linha a linha, contra a média mensal.', status: 'ok', abrir: 'comparativo' },
  { titulo: 'DRE — Resultado do Exercício', desc: 'Cascata da DRE, margens (Bruta/EBITDA/Líquida) e análise vertical.', status: 'ok', abrir: 'dre' },
  { titulo: 'Fluxo de Caixa', desc: 'Variação de caixa por atividade (waterfall).', status: 'ok', abrir: 'dfc' },
  { titulo: 'Evolução & Projeção', desc: 'Série mensal contínua (competência/caixa) com previsão por tendência linear ou média móvel.', status: 'ok', abrir: 'evolucao' },
  { titulo: 'Análise de Custos e Despesas', desc: 'Breakdown dos grupos de saída, % da receita e composição.', status: 'ok', abrir: 'custos' },
  { titulo: 'Análise de Receita Líquida', desc: 'Evolução mensal e fontes de receita (mix por UN e drivers ainda dependem de dado).', status: 'parcial', abrir: 'receita', falta: 'segmentação por unidade de negócio + drivers (volume/preço/mix/câmbio)' },
  { titulo: 'Resultado por Filial / Centro de Custo', desc: 'Receitas e despesas separadas por filial — rateio Omie automático + atribuição manual por movimento no detalhamento.', status: 'ok', abrir: 'filiais' },
  { titulo: 'Painel de Capital de Giro', desc: 'Títulos em aberto e aging de recebíveis/pagáveis.', status: 'parcial', abrir: 'giro', falta: 'estoque para PME e período p/ PMR/PMP (CCC)' },
  { titulo: 'Movimentos Neutros', desc: 'Trilha de auditoria das transferências, aportes e estornos (Regra Mãe) — fora de DRE/DFC e indicadores.', status: 'ok', abrir: 'neutros' },
  { titulo: 'Apresentação HTML', desc: 'Todos os relatórios num arquivo único navegável — intro animada, filtros e gráficos offline, pronto para enviar ao cliente.', status: 'ok', abrir: 'apresentacao' },
  { titulo: 'Previsto × Realizado (mensal)', desc: 'Realizado por baixas (auditável Omie) + realizável de títulos em aberto, mês a mês.', status: 'parcial', abrir: 'previsto', falta: 'orçamento (previsto) preenchido na Omie' },
  { titulo: 'DRE Gerencial', desc: 'Comparativo orçado × realizado.', status: 'requer', falta: 'orçamento (previsto)' },
  { titulo: 'Análise de Riscos Financeiros', desc: 'Matriz probabilidade × impacto e stress test.', status: 'requer', falta: 'matriz qualitativa de riscos + premissas de stress' },
  { titulo: 'Conclusões e Recomendações', desc: 'Síntese estratégica e plano de ação.', status: 'requer', falta: 'texto e metas do analista' },
]

const BADGE: Readonly<Record<Status, { rotulo: string; classe: string }>> = {
  ok: { rotulo: 'disponível', classe: 'bg-accent/15 text-accent' },
  planejado: { rotulo: 'planejado', classe: 'bg-secondary/15 text-secondary' },
  parcial: { rotulo: 'parcial', classe: 'bg-warn/20 text-warn' },
  requer: { rotulo: 'requer dado', classe: 'bg-danger/15 text-danger' },
}

export function Catalogo({ onAbrir }: { onAbrir: (v: VistaRel) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Relatórios</h1>
        <p className="text-sm text-muted">
          Relatórios executivos do cliente ativo. Os marcados como “requer dado” precisam de uma fonte
          que ainda não temos — listada em cada card.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITENS.map((it) => (
          <Card key={it.titulo} item={it} onAbrir={onAbrir} />
        ))}
      </div>
    </div>
  )
}

function Card({ item, onAbrir }: { item: Item; onAbrir: (v: VistaRel) => void }) {
  const badge = BADGE[item.status]
  const clicavel = Boolean(item.abrir)
  return (
    <button
      type="button"
      disabled={!clicavel}
      onClick={() => item.abrir && onAbrir(item.abrir)}
      className={`flex flex-col gap-2 rounded-card border border-bd bg-surface p-4 text-left transition-all ${
        clicavel ? 'hover:-translate-y-0.5 hover:border-primary' : 'cursor-default opacity-80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold">{item.titulo}</span>
        <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${badge.classe}`}>{badge.rotulo}</span>
      </div>
      <p className="text-sm text-muted">{item.desc}</p>
      {item.falta ? <p className="text-[11px] text-muted/80">Falta: {item.falta}</p> : null}
      {clicavel ? <span className="mt-auto text-xs font-medium text-secondary">Abrir →</span> : null}
    </button>
  )
}
