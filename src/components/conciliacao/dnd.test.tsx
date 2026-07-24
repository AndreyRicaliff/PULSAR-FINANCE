// @vitest-environment jsdom
/**
 * Guarda de regressão do drag-and-drop da conciliação — o bug do financeiro (2026-07-24):
 * (1) soltar categoria no GRUPO não classificava (só subgrupo tinha DropZone);
 * (2) a linha inteira era `draggable`, sequestrando o clique do <select> "conciliar em…".
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { No } from '@/core/modelo'
import { AConciliar } from './AConciliar.tsx'
import { DropZone } from './DropZone.tsx'
import { EtiquetaFluxo } from './EtiquetaFluxo.tsx'
import { RaizCard } from './RaizCard.tsx'
import type { ItemConc } from './tipos'

afterEach(cleanup)

const dt = (chave: string) => ({ dataTransfer: { getData: () => chave, setData: () => {} } })

const raiz: No = { id: 'g1', nome: 'Despesas', paiId: null, meta: { regime: 'ambos' } }
const sub: No = { id: 's1', nome: 'Pessoal', paiId: 'g1', meta: { regime: 'ambos' } }
const item: ItemConc = { chave: 'cat-42', titulo: 'Salários', valorCentavos: 1000, qtd: 3 }

function renderRaiz(subgrupos: No[], onMapear = vi.fn()) {
  const props = {
    raiz,
    subgrupos,
    mapa: {},
    porChave: new Map([[item.chave, item]]),
    recolhido: false,
    onAlternarRecolhido: vi.fn(),
    onAddSub: vi.fn(),
    permiteRegime: true,
    onRemoveNo: vi.fn(),
    onMapear,
    onDesmapear: vi.fn(),
    onContextItem: vi.fn(),
    onContextNo: vi.fn(),
  }
  const utils = render(<RaizCard {...props} />)
  return { onMapear, ...utils }
}

describe('DropZone', () => {
  it('drop entrega a chave do dataTransfer ao onSoltar', () => {
    const onSoltar = vi.fn()
    const { container } = render(
      <DropZone onSoltar={onSoltar} className="z">
        <span>alvo</span>
      </DropZone>,
    )
    fireEvent.drop(container.firstChild as Element, dt('cat-9'))
    expect(onSoltar).toHaveBeenCalledWith('cat-9')
  })
})

describe('RaizCard — drop no grupo (FIX 2026-07-24)', () => {
  it('soltar no corpo do grupo mapeia direto na raiz', () => {
    const { container, onMapear } = renderRaiz([])
    fireEvent.drop(container.firstChild as Element, dt('cat-42'))
    expect(onMapear).toHaveBeenCalledWith('cat-42', 'g1')
  })

  it('soltar num subgrupo vence a raiz (stopPropagation) → mapeia no subgrupo', () => {
    const { onMapear } = renderRaiz([sub])
    const alvoSub = screen.getByText('↳ Pessoal')
    fireEvent.drop(alvoSub, dt('cat-42'))
    expect(onMapear).toHaveBeenCalledTimes(1)
    expect(onMapear).toHaveBeenCalledWith('cat-42', 's1')
  })
})

describe('EtiquetaFluxo — Entrada/Saída pela natureza (só visual)', () => {
  it('receita → Entrada, despesa → Saída, resto → sem etiqueta', () => {
    const { rerender, queryByText } = render(<EtiquetaFluxo natureza="receita" />)
    expect(queryByText('Entrada')).not.toBeNull()
    rerender(<EtiquetaFluxo natureza="despesa" />)
    expect(queryByText('Saída')).not.toBeNull()
    rerender(<EtiquetaFluxo natureza="transferencia" />)
    expect(queryByText('Entrada')).toBeNull()
    expect(queryByText('Saída')).toBeNull()
    rerender(<EtiquetaFluxo natureza={undefined} />)
    expect(queryByText('Entrada')).toBeNull()
  })
})

describe('AConciliar — a linha não é draggable, só a alça (FIX 2026-07-24)', () => {
  it('o <select> "conciliar em…" convive com o drag (alça dedicada arrasta)', () => {
    const onMapear = vi.fn()
    render(
      <AConciliar
        itens={[item]}
        estrutura={[raiz, sub]}
        termo="a categoria"
        onMapear={onMapear}
        onDesmapear={vi.fn()}
        onContextItem={vi.fn()}
      />,
    )
    const linha = screen.getByText('Salários').closest('tr') as HTMLElement
    // A linha não pode ser draggable (senão rouba o mousedown do <select>).
    expect(linha.getAttribute('draggable')).not.toBe('true')
    // Existe uma alça dedicada draggable dentro da linha.
    const alca = within(linha).getByTitle('Arraste para outra linha')
    expect(alca.getAttribute('draggable')).toBe('true')
    // E o <select> de atribuição por clique está presente e utilizável.
    const select = within(linha).getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 's1' } })
    expect(onMapear).toHaveBeenCalledWith('cat-42', 's1')
  })
})
