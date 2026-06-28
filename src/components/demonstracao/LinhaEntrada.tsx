/** @file Linha de entrada da estrutura (DropZone + chips dos grupos alocados, com drill e mover/remover). */
import { useState } from 'react'
import { brl } from '@/lib/money'
import { ordemGrupo } from '@/lib/graficos'
import type { LinhaCalc } from '@/core/demonstracao'
import { DropZone } from '../conciliacao/DropZone.tsx'
import { Grip, NomeExpansivel, Valores } from './atomos.tsx'
import { Arvore } from './Arvore.tsx'
import type { AcoesArvore, Comparacao, GrupoAlocavel } from './tipos.ts'

export function LinhaEntrada({
  linha,
  padrao,
  porId,
  comp,
  entradas,
  acoes,
  onSoltar,
  onMover,
  onDesalocar,
}: {
  linha: LinhaCalc
  padrao: number
  porId: ReadonlyMap<string, GrupoAlocavel>
  comp: Comparacao
  entradas: readonly LinhaCalc[]
  acoes: AcoesArvore
  onSoltar: (grupoId: string) => void
  onMover: (grupoId: string, linhaId: string) => void
  onDesalocar: (grupoId: string) => void
}) {
  // Despacho por prefixo: classe (cls:) e subgrupo (sub:) mexem no override certo; grupo no fluxo normal.
  const despachar = (chave: string, linhaId: string, fallback: () => void) => {
    if (chave.startsWith('cls:')) acoes.onAlocarClasse(chave.slice(4), linhaId)
    else if (chave.startsWith('sub:')) acoes.onAlocarSub(chave.slice(4), linhaId)
    else fallback()
  }
  const soltar = (chave: string) => despachar(chave, linha.id, () => onSoltar(chave))
  const mover = (chave: string, linhaId: string) => despachar(chave, linhaId, () => onMover(chave, linhaId))
  // ✕: override volta a "segue acima" (limpa); grupo desaloca de verdade.
  const remover = (chave: string) => despachar(chave, '', () => onDesalocar(chave))
  return (
    <DropZone onSoltar={soltar} className="rounded-card border border-bd bg-surface">
      <div className="flex items-center justify-between border-b border-bd px-4 py-2.5">
        <span className="font-medium">{linha.nome}</span>
        <Valores editado={linha.valorCentavos} padrao={padrao} />
      </div>
      {linha.gruposIds.length === 0 ? (
        <p className="px-4 py-2 text-xs text-muted">arraste um grupo aqui</p>
      ) : (
        <ul className="divide-y divide-bd/50">
          {[...linha.gruposIds]
            .sort((a, b) => ordemGrupo(porId.get(a)?.nome ?? '') - ordemGrupo(porId.get(b)?.nome ?? ''))
            .map((g) => (
              <Chip
                key={g}
                grupo={porId.get(g)}
                grupoId={g}
                linhaAtual={linha.id}
                comp={comp}
                entradas={entradas}
                acoes={acoes}
                onMover={mover}
                onRemover={() => remover(g)}
              />
            ))}
        </ul>
      )}
    </DropZone>
  )
}

function Chip({
  grupo,
  grupoId,
  linhaAtual,
  comp,
  entradas,
  acoes,
  onMover,
  onRemover,
}: {
  grupo: GrupoAlocavel | undefined
  grupoId: string
  linhaAtual: string
  comp: Comparacao
  entradas: readonly LinhaCalc[]
  acoes: AcoesArvore
  onMover: (grupoId: string, linhaId: string) => void
  onRemover: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const arvore = grupo?.arvore ?? []
  const linhaPadrao = comp.mapaPadrao[grupoId]
  const movido = (linhaPadrao ?? '') !== linhaAtual
  const tituloPadrao = linhaPadrao ? comp.nomeLinha.get(linhaPadrao) ?? linhaPadrao : 'fora da demonstração'
  return (
    <li className="text-sm">
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <Grip chave={grupoId} />
        <NomeExpansivel
          nome={grupo?.nome ?? grupoId}
          aberto={aberto}
          temDrill={arvore.length > 0}
          onAlternar={() => setAberto((v) => !v)}
          tag={
            movido ? (
              <span className="shrink-0 rounded bg-warn/20 px-1.5 py-0.5 text-[10px] font-medium text-warn" title={`Padrão: ${tituloPadrao}`}>
                movido
              </span>
            ) : undefined
          }
        />
        <span className="flex shrink-0 items-center gap-2">
          <span className="tabular-nums text-muted">{grupo ? brl(grupo.totalCentavos) : ''}</span>
          <select
            value=""
            onChange={(e) => e.target.value && onMover(grupoId, e.target.value)}
            title="Mover para outra linha"
            className="rounded border border-bd bg-surface2 px-1.5 py-0.5 text-[11px] text-muted outline-none focus:border-primary"
          >
            <option value="">mover…</option>
            {entradas
              .filter((l) => l.id !== linhaAtual)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
          </select>
          <button type="button" onClick={onRemover} title="Tirar da demonstração (volta para a conciliar)" className="text-muted hover:text-danger">
            ✕
          </button>
        </span>
      </div>
      {aberto ? <div className="bg-surface2/30 pl-4"><Arvore subgrupos={arvore} acoes={acoes} /></div> : null}
    </li>
  )
}
