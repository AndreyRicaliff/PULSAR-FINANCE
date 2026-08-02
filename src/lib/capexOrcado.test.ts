import { describe, expect, it } from 'vitest'
import type { Conciliacao } from '@/core/modelo'
import { adesaoCapex } from './capexOrcado'

const conc: Conciliacao = {
  estrutura: [
    { id: 'g_inv', nome: 'Investimento', paiId: null },
    { id: 'inv_imob', nome: 'Imobilizado', paiId: 'g_inv', meta: { capex: 'investimento' } },
    { id: 'adm_manut', nome: 'Manutenção', paiId: null, meta: { capex: 'manutencao' } },
    { id: 'outro', nome: 'Outro', paiId: null },
  ],
  mapa: { '2.08.01': 'inv_imob', '2.05.06': 'adm_manut', '2.05.04': 'outro' },
}

const MESES = {
  '2026-01': [
    { categoria: '2.08.01', previstoCentavos: 100_000, realizadoCentavos: 80_000 },
    { categoria: '2.05.06', previstoCentavos: 20_000, realizadoCentavos: 25_000 },
    { categoria: '2.05.04', previstoCentavos: 999_000, realizadoCentavos: 999_000 }, // fora
  ],
  '2026-02': [{ categoria: '2.08.01', previstoCentavos: 50_000, realizadoCentavos: 0 }],
}

describe('adesaoCapex', () => {
  it('soma previsto/realizado só das categorias conciliadas em nós marcados, por balde', () => {
    const a = adesaoCapex(MESES, ['2026-01', '2026-02'], conc)
    expect(a.investimento).toEqual({ previstoCentavos: 150_000, realizadoCentavos: 80_000 })
    expect(a.manutencao).toEqual({ previstoCentavos: 20_000, realizadoCentavos: 25_000 })
  })

  it('recorte de meses limita a soma', () => {
    const a = adesaoCapex(MESES, ['2026-02'], conc)
    expect(a.investimento).toEqual({ previstoCentavos: 50_000, realizadoCentavos: 0 })
    expect(a.manutencao).toEqual({ previstoCentavos: 0, realizadoCentavos: 0 })
  })
})
