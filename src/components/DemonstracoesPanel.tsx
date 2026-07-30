/** @file Aba unificada "Editar DRE/DFC": edição da estrutura + visão com drill-down, sincronizada por período. */
import { useMemo, useState } from 'react'
import { descricoesAmbiguas, rotuloCategoria } from '@/core/categoria'
import { arvorePorGrupo, totaisEfetivos } from '@/core/classes'
import { calcular, demonstracaoPadrao, LINHA_FORA, mapaPadrao, type TipoDemo } from '@/core/demonstracao'
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
  // O período vem do Shell (filtro global) — montar um provider aqui isolava a aba.
  return <Conteudo />
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

  // TODAS as personalizações vs padrão — grupos remapeados E overrides de subgrupo/classe.
  // O contador antigo só via grupos: mostrava "0 remapeados" com Δ gigante quando a mudança
  // era um override, e o financeiro leu como bug (AUTAG, 2026-07-28).
  const mudancas = useMemo<Mudanca[]>(() => {
    const noNome = new Map(conc.estrutura.map((n) => [n.id, n.nome]))
    const catNome = new Map(cadCategorias.categorias.map((c) => [c.codigo, c.descricao]))
    const ambiguas = descricoesAmbiguas(cadCategorias.categorias)
    const linha = (id: string) => comp.nomeLinha.get(id) ?? id
    const lista: Mudanca[] = []
    for (const g of gruposAlocaveis) {
      const pad = comp.mapaPadrao[g.id] ?? ''
      const cur = demoMapa[g.id] ?? ''
      if (pad === cur) continue
      lista.push({
        chave: `g:${g.id}`,
        origem: 'Grupo',
        nome: g.nome,
        atual: cur ? linha(cur) : 'não alocado',
        padrao: pad ? linha(pad) : 'não alocado',
        aoRestaurar: () => (pad ? dem.alocar(tipo, g.id, pad) : dem.desalocar(tipo, g.id)),
      })
    }
    for (const [subId, l] of Object.entries(demoTipo.mapaSub ?? {})) {
      lista.push({
        chave: `s:${subId}`,
        origem: 'Subgrupo',
        nome: noNome.get(subId) ?? subId,
        atual: l === LINHA_FORA ? 'removido desta demonstração' : linha(l),
        padrao: 'segue o grupo',
        aoRestaurar: () => dem.alocarSub(tipo, subId, ''),
      })
    }
    for (const [cod, l] of Object.entries(demoTipo.mapaClasse ?? {})) {
      lista.push({
        chave: `c:${cod}`,
        origem: 'Classe',
        nome: rotuloCategoria(cod, catNome.get(cod) ?? '', ambiguas),
        atual: l === LINHA_FORA ? 'removida desta demonstração' : linha(l),
        padrao: 'segue o grupo',
        aoRestaurar: () => dem.alocarClasse(tipo, cod, ''),
      })
    }
    return lista
  }, [gruposAlocaveis, comp, demoMapa, demoTipo, conc.estrutura, cadCategorias, dem, tipo])
  const [mudancasAbertas, setMudancasAbertas] = useState(false)
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
    const ambiguas = descricoesAmbiguas(cadCategorias.categorias)
    const pseudo = [...ef.totalPorChave]
      .filter(([k]) => k.startsWith('sub:') || k.startsWith('cls:'))
      .map(([k, total]) => {
        const ref = k.slice(4)
        const nome = k.startsWith('sub:') ? noNome.get(ref) ?? ref : rotuloCategoria(ref, catNome.get(ref) ?? '', ambiguas)
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
          <h1 className="text-[19px] font-semibold">Editar DRE/DFC</h1>
          <p className="text-sm text-muted">
            Edite a estrutura e veja o resultado com drill-down — sincronizado por período · neutros e não conciliados fora
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            // Com contexto real: diz QUANTAS mudanças serão desfeitas (o modal de mudanças
            // já guarda o caminho item a item — este botão zera tudo, então confirma).
            if (mudancas.length === 0) return dem.restaurar(tipo)
            if (
              window.confirm(
                `Restaurar o padrão desfaz ${mudancas.length} mudança(s) feitas na ${tipo.toUpperCase()} — remapeamentos e overrides voltam ao padrão AG. Para desfazer só um item, use "Ver mudanças". Confirmar?`,
              )
            )
              dem.restaurar(tipo)
          }}
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
                <Discrepancia
                  mudancas={mudancas.length}
                  editado={ultima?.valorCentavos ?? 0}
                  padrao={comp.valorPadrao.get(ultima?.id ?? '') ?? 0}
                  aoAbrir={() => setMudancasAbertas(true)}
                />
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
      {mudancasAbertas ? (
        <MudancasModal
          mudancas={mudancas}
          tipo={tipo}
          aoRestaurarTudo={() => {
            dem.restaurar(tipo)
            setMudancasAbertas(false)
          }}
          aoFechar={() => setMudancasAbertas(false)}
        />
      ) : null}
      {detalhe.modal}
    </div>
  )
}

interface Mudanca {
  readonly chave: string
  readonly origem: 'Grupo' | 'Subgrupo' | 'Classe'
  readonly nome: string
  readonly atual: string
  readonly padrao: string
  readonly aoRestaurar: () => void
}

/**
 * Alerta minimalista. O anterior riscava o padrão e listava Δ na própria faixa — lia-se
 * como erro. Agora: uma frase, e o detalhe inteiro no pop-up.
 */
function Discrepancia({ mudancas, editado, padrao, aoAbrir }: { mudancas: number; editado: number; padrao: number; aoAbrir: () => void }) {
  const delta = editado - padrao
  if (mudancas === 0 && delta === 0) {
    return (
      <div className="rounded-card border border-bd bg-surface p-3 text-sm text-muted">
        Igual ao padrão dos MDs — nada personalizado.
      </div>
    )
  }
  if (mudancas === 0) {
    return (
      <div className="rounded-card border border-bd bg-surface p-3 text-sm text-muted">
        Estrutura própria deste cliente — a comparação com o padrão AG não se aplica a todos os grupos.
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-warn/30 bg-surface p-3 text-sm">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-warn" />
      <span>
        <strong>{mudancas}</strong> mudança(s) em relação ao padrão
        {delta !== 0 ? <span className="text-muted"> · resultado difere em {brl(delta)}</span> : null}
      </span>
      <button type="button" onClick={aoAbrir} className="fx-press rounded-lg border border-bd px-3 py-1 text-xs font-medium text-muted hover:text-text">
        Ver mudanças
      </button>
    </div>
  )
}

function MudancasModal({
  mudancas,
  tipo,
  aoRestaurarTudo,
  aoFechar,
}: {
  mudancas: readonly Mudanca[]
  tipo: TipoDemo
  aoRestaurarTudo: () => void
  aoFechar: () => void
}) {
  return (
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mudanças em relação ao padrão"
        className="anim-pop flex max-h-[85vh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-card border border-bd bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2 className="text-lg font-bold">Mudanças em relação ao padrão · {tipo.toUpperCase()}</h2>
          <p className="text-sm text-muted">
            O que foi movido nesta demonstração, onde está agora e onde o padrão colocaria.
            Restaurar desfaz só aquele item.
          </p>
        </header>

        {mudancas.length === 0 ? (
          <p className="rounded-card border border-dashed border-bd p-6 text-center text-sm text-muted">
            Nada personalizado — tudo no padrão.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mudancas.map((m) => (
              <li key={m.chave} className="flex flex-wrap items-center gap-3 rounded-card border border-bd bg-surface2/50 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="rounded bg-secondary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-secondary">
                      {m.origem}
                    </span>
                    <span className="truncate">{m.nome}</span>
                  </p>
                  <p className="text-xs text-muted">
                    está em: <span className="text-text">{m.atual}</span> · padrão: {m.padrao}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={m.aoRestaurar}
                  className="fx-press rounded-lg border border-bd px-3 py-1.5 text-xs font-medium text-muted hover:border-primary hover:text-text"
                >
                  Restaurar
                </button>
              </li>
            ))}
          </ul>
        )}

        <footer className="flex items-center justify-between gap-2 border-t border-bd pt-4">
          <button
            type="button"
            onClick={aoRestaurarTudo}
            className="fx-press rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger"
          >
            Restaurar tudo ({tipo.toUpperCase()})
          </button>
          <button type="button" onClick={aoFechar} className="fx-press rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
            Fechar
          </button>
        </footer>
      </div>
    </div>
  )
}
