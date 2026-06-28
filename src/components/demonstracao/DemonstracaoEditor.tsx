/** @file Editor de uma demonstração (DRE ou DFC): arrasta grupos da estrutura para as linhas. */
import { ordemGrupo } from '@/lib/graficos'
import type { LinhaCalc } from '@/core/demonstracao'
import { Valores } from './atomos.tsx'
import { AAlocar } from './AAlocar.tsx'
import { LinhaEntrada } from './LinhaEntrada.tsx'
import { catalogoComOverrides, type AcoesArvore, type Comparacao, type GrupoAlocavel } from './tipos.ts'

export type { AcoesArvore, Comparacao, GrupoAlocavel } from './tipos.ts'

interface Props {
  readonly calc: readonly LinhaCalc[]
  readonly grupos: readonly GrupoAlocavel[]
  readonly mapa: Readonly<Record<string, string>>
  readonly comp: Comparacao
  readonly acoes: AcoesArvore
  readonly onAlocar: (grupoId: string, linhaId: string) => void
  readonly onDesalocar: (grupoId: string) => void
}

export function DemonstracaoEditor({ calc, grupos, mapa, comp, acoes, onAlocar, onDesalocar }: Props) {
  // Catálogo inclui chaves de override (sub:/cls:) da árvore → chips de override mostram nome+valor
  // (sem isto a chave crua "sub:rb_servicos" vaza na tela). Só grupos entram em "a alocar".
  const porId = catalogoComOverrides(grupos)
  const naoAlocados = grupos.filter((g) => !mapa[g.id]).sort((a, b) => ordemGrupo(a.nome) - ordemGrupo(b.nome))
  const entradas = calc.filter((l) => l.tipo === 'entrada')

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Cabecalho />
        {calc.map((l) =>
          l.tipo === 'subtotal' ? (
            <Subtotal key={l.id} linha={l} padrao={comp.valorPadrao.get(l.id) ?? 0} />
          ) : (
            <LinhaEntrada
              key={l.id}
              linha={l}
              padrao={comp.valorPadrao.get(l.id) ?? 0}
              porId={porId}
              comp={comp}
              entradas={entradas}
              acoes={acoes}
              onSoltar={(g) => onAlocar(g, l.id)}
              onMover={onAlocar}
              onDesalocar={onDesalocar}
            />
          ),
        )}
      </div>

      <AAlocar grupos={naoAlocados} entradas={entradas} acoes={acoes} onAlocar={onAlocar} />
    </div>
  )
}

function Cabecalho() {
  return (
    <div className="flex items-center justify-between px-1 text-sm font-semibold uppercase tracking-wide text-muted">
      <span>Estrutura da demonstração</span>
      <span className="text-xs normal-case">editado · padrão · Δ</span>
    </div>
  )
}

function Subtotal({ linha, padrao }: { linha: LinhaCalc; padrao: number }) {
  return (
    <div className="flex items-center justify-between rounded-card border border-bd bg-surface2/50 px-4 py-2.5">
      <span className="font-bold">{linha.nome}</span>
      <Valores editado={linha.valorCentavos} padrao={padrao} />
    </div>
  )
}
