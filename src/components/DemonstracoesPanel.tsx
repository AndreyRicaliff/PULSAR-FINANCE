/** @file Aba unificada "Editar DRE/DFC": edição da estrutura + visão com drill-down, sincronizada por período. */
import { useMemo, useState } from 'react'
import { rotuloCategoria } from '@/core/categoria'
import { arvorePorGrupo, totaisEfetivos } from '@/core/classes'
import { calcular, demonstracaoPadrao, mapaPadrao, type TipoDemo } from '@/core/demonstracao'
import { movimentosCaixa } from '@/core/movimento'
import { ESTRUTURA_PADRAO_AG } from '@/core/modelo'
import { useCadastros } from '@/lib/cadastros'
import { useMovimentos } from '@/lib/movimentos'
import { brl } from '@/lib/money'
import { PeriodoProvider } from '@/lib/periodo'
import { espelhoEstrutura } from '@/lib/resultado'
import { useDemonstracoes } from '@/lib/useDemonstracoes'
import { useModelo } from '@/lib/useModelo'
import { useResultado } from '@/lib/useResultado'
import { DemonstracaoEditor, type Comparacao, type GrupoAlocavel } from './demonstracao/DemonstracaoEditor.tsx'
import { OrdenarGrupos } from './demonstracao/OrdenarGrupos.tsx'
import { EstruturaEspelho } from './EstruturaEspelho.tsx'
import { KpiCard } from './KpiCard.tsx'
import { ResumoPeriodo } from './ResumoPeriodo.tsx'
import { Segmento, type OpcaoSeg } from './Segmento.tsx'
import { TabelaDemonstracao } from './TabelaDemonstracao.tsx'
import { useDetalheDemonstracao } from './useDetalheDemonstracao.tsx'
import { FiltroPeriodo } from './relatorios/FiltroPeriodo.tsx'

type Aba = 'dre' | 'dfc' | 'espelho'
type Modo = 'editar' | 'detalhar'

const ABAS: readonly OpcaoSeg<Aba>[] = [
  { id: 'dre', rotulo: 'DRE' },
  { id: 'dfc', rotulo: 'DFC' },
  { id: 'espelho', rotulo: 'Espelho da Estrutura' },
]
const MODOS: readonly OpcaoSeg<Modo>[] = [
  { id: 'editar', rotulo: 'Editar estrutura' },
  { id: 'detalhar', rotulo: 'Detalhar valores' },
]

export function DemonstracoesPanel() {
  return (
    <PeriodoProvider>
      <Conteudo />
    </PeriodoProvider>
  )
}

function Conteudo() {
  const r = useResultado()
  const dem = useDemonstracoes()
  const { modelo, reordenarNo } = useModelo()
  const { movimentos: todos } = useMovimentos()
  const { categorias: cadCategorias } = useCadastros()
  const conc = modelo.contas
  const [ordenando, setOrdenando] = useState(false)
  const [aba, setAba] = useState<Aba>('dre')
  const [modo, setModo] = useState<Modo>('editar')
  const detalhe = useDetalheDemonstracao(r.movimentos, conc, cadCategorias.categorias)

  const tipo: TipoDemo = aba === 'dfc' ? 'dfc' : 'dre'
  const calc = aba === 'dfc' ? r.dfc : r.dre
  const anterior = aba === 'dfc' ? r.anterior?.dfc : r.anterior?.dre

  // DFC = caixa: totais/drill do tab DFC excluem valores a vencer (consistente com a linha).
  const movsTab = useMemo(() => (aba === 'dfc' ? movimentosCaixa(r.movimentos) : r.movimentos), [aba, r.movimentos])
  const espelhoTab = useMemo(() => (aba === 'dfc' ? espelhoEstrutura(movsTab, conc) : r.grupos), [aba, movsTab, conc, r.grupos])

  // Valores do período por grupo, do espelho do tab (caixa no DFC).
  const totalPeriodo = useMemo(() => new Map(espelhoTab.map((g) => [g.id, g.totalCentavos])), [espelhoTab])
  // Todos os grupos-raiz na ordem da estrutura (fonte da numeração = posição).
  const gruposOrdem = useMemo(
    () => conc.estrutura.filter((n) => !n.paiId).map((n) => ({ id: n.id, nome: n.nome, totalCentavos: totalPeriodo.get(n.id) ?? 0 })),
    [conc.estrutura, totalPeriodo],
  )
  // Árvore subgrupo → classe (agrupadora Omie) por grupo, com valores do período.
  const arvore = useMemo(
    () => arvorePorGrupo(movsTab, conc, cadCategorias.categorias),
    [movsTab, conc, cadCategorias],
  )
  // Todos os grupos da estrutura — "a alocar" nunca esconde grupo sem movimento no período.
  const gruposAlocaveis = useMemo<GrupoAlocavel[]>(
    () =>
      espelhoEstrutura(todos, conc).map((g) => ({
        id: g.id,
        nome: g.nome,
        totalCentavos: totalPeriodo.get(g.id) ?? 0,
        neutra: g.meta?.neutra ?? false,
        arvore: arvore.get(g.id) ?? [],
      })),
    [todos, conc, totalPeriodo, arvore],
  )

  const comp = useMemo<Comparacao>(() => {
    const padrao = demonstracaoPadrao(tipo, ESTRUTURA_PADRAO_AG)
    const calcPadrao = calcular(padrao, totalPeriodo)
    return {
      valorPadrao: new Map(calcPadrao.map((l) => [l.id, l.valorCentavos])),
      mapaPadrao: mapaPadrao(tipo, ESTRUTURA_PADRAO_AG),
      nomeLinha: new Map(calc.map((l) => [l.id, l.nome])),
    }
  }, [tipo, totalPeriodo, calc])

  const demoTipo = dem.demo[tipo]
  const demoMapa = demoTipo.mapa
  const remapeados = gruposAlocaveis.filter((g) => (comp.mapaPadrao[g.id] ?? '') !== (demoMapa[g.id] ?? '')).length
  const acoes = {
    entradas: calc.filter((l) => l.tipo === 'entrada'),
    mapaSub: demoTipo.mapaSub ?? {},
    mapaClasse: demoTipo.mapaClasse ?? {},
    onAlocarSub: (subId: string, linhaId: string) => dem.alocarSub(tipo, subId, linhaId),
    onAlocarClasse: (classeCod: string, linhaId: string) => dem.alocarClasse(tipo, classeCod, linhaId),
    onDetalheClasse: (codigo: string, nome: string, subId: string) => detalhe.detalhar({ titulo: nome, classe: codigo, ids: [subId] }),
  }

  // Drill de "Detalhar valores": inclui pseudo-grupos para chaves de override (sub:/cls:).
  const gruposDrill = useMemo(() => {
    const ef = totaisEfetivos(movsTab, conc, cadCategorias.categorias, demoTipo, tipo)
    const noNome = new Map(conc.estrutura.map((n) => [n.id, n.nome]))
    const catNome = new Map(cadCategorias.categorias.map((c) => [c.codigo, c.descricao]))
    const pseudo = [...ef.totalPorChave]
      .filter(([k]) => k.startsWith('sub:') || k.startsWith('cls:'))
      .map(([k, total]) => {
        const ref = k.slice(4)
        const nome = k.startsWith('sub:') ? noNome.get(ref) ?? ref : rotuloCategoria(ref, catNome.get(ref) ?? '')
        return { id: k, nome, totalCentavos: total, qtd: 1, subgrupos: [] }
      })
    return [...espelhoTab, ...pseudo]
  }, [movsTab, espelhoTab, conc, cadCategorias, demoTipo])
  const ultima = calc[calc.length - 1]
  const receita = r.dre.find((l) => l.id === 'dre_receita')?.valorCentavos ?? 0
  const ebitda = r.dre.find((l) => l.id === 'dre_ebitda')?.valorCentavos ?? 0
  const liquido = r.dre.find((l) => l.id === 'dre_liquido')?.valorCentavos ?? 0

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Editar DRE/DFC</h1>
          <p className="text-sm text-muted">
            Edite a estrutura e veja o resultado com drill-down — sincronizado por período · neutros e não conciliados fora
          </p>
        </div>
        <button
          type="button"
          onClick={() => dem.restaurar(tipo)}
          className="rounded-lg border border-bd px-3 py-1.5 text-sm font-medium text-muted hover:text-text"
        >
          Restaurar padrão ({tipo.toUpperCase()})
        </button>
      </header>

      <FiltroPeriodo info={r.periodo} />
      <ResumoPeriodo
        contexto="periodo"
        movimentos={r.movimentos}
        regime={r.periodo.regime}
        conc={conc}
        rotulo="DRE/DFC do período selecionado acima — afeta os valores em todas as abas do sistema"
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard rotulo="Receita Bruta" valor={brl(receita)} cor="accent" />
        <KpiCard rotulo="EBITDA" valor={brl(ebitda)} cor="secondary" />
        <KpiCard rotulo="Resultado Líquido" valor={brl(liquido)} cor={liquido >= 0 ? 'primary' : 'danger'} />
      </section>

      <Segmento opcoes={ABAS} valor={aba} onTrocar={setAba} />

      {aba === 'espelho' ? (
        <EstruturaEspelho grupos={r.grupos} />
      ) : (
        <>
          <Segmento opcoes={MODOS} valor={modo} onTrocar={setModo} />
          {modo === 'editar' ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <Discrepancia remapeados={remapeados} editado={ultima?.valorCentavos ?? 0} padrao={comp.valorPadrao.get(ultima?.id ?? '') ?? 0} />
                <button
                  type="button"
                  onClick={() => setOrdenando((v) => !v)}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    ordenando ? 'border-primary bg-primary/10 text-secondary' : 'border-bd text-muted hover:text-text'
                  }`}
                >
                  {ordenando ? 'Concluir ordenação' : 'Ordenar grupos'}
                </button>
              </div>
              {ordenando ? (
                <OrdenarGrupos grupos={gruposOrdem} onReordenar={(id, i) => reordenarNo('contas', id, i)} />
              ) : null}
              {gruposAlocaveis.length === 0 ? (
                <p className="rounded-card border border-dashed border-bd p-8 text-center text-muted">
                  Nenhum grupo — concilie categorias em "Matriz de Classificações" primeiro.
                </p>
              ) : (
                <DemonstracaoEditor
                  calc={calc}
                  grupos={gruposAlocaveis}
                  mapa={demoMapa}
                  comp={comp}
                  acoes={acoes}
                  onAlocar={(g, l) => dem.alocar(tipo, g, l)}
                  onDesalocar={(g) => dem.desalocar(tipo, g)}
                />
              )}
            </>
          ) : (
            <TabelaDemonstracao
              titulo={`${aba.toUpperCase()} · ${aba === 'dre' ? 'competência' : 'caixa · só liquidado'}`}
              linhas={calc}
              grupos={gruposDrill}
              base={aba === 'dre' ? receita : 0}
              anterior={anterior}
              onDetalhar={detalhe.detalhar}
            />
          )}
        </>
      )}
      {detalhe.modal}
    </div>
  )
}

function Discrepancia({ remapeados, editado, padrao }: { remapeados: number; editado: number; padrao: number }) {
  const delta = editado - padrao
  const limpo = remapeados === 0 && delta === 0
  return (
    <div className={`rounded-card border p-3 text-sm ${limpo ? 'border-bd bg-surface' : 'border-warn/40 bg-warn/10'}`}>
      {limpo ? (
        <span className="text-muted">Sem personalização — igual ao padrão dos MDs (imutável).</span>
      ) : (
        <span>
          <strong>{remapeados}</strong> grupo(s) remapeado(s) vs padrão · Resultado:{' '}
          <span className="font-semibold">{brl(editado)}</span> (padrão{' '}
          <span className="line-through">{brl(padrao)}</span> · Δ{' '}
          <span className="font-semibold text-warn">{brl(delta)}</span>)
        </span>
      )}
    </div>
  )
}
