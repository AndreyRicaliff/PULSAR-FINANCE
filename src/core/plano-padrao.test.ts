import { describe, expect, it } from 'vitest'
import type { No } from './modelo'
import { aplicarCapexPadrao } from './plano-padrao'

describe('aplicarCapexPadrao (migração de estrutura salva)', () => {
  it('nó-padrão sem a chave capex ganha a marcação, preservando o meta do usuário', () => {
    const salvo: No[] = [
      // Estrutura salva antes dos defaults: sub carregava o meta copiado do grupo + regime custom.
      { id: 'adm_manutencao', nome: 'Manutenção e Conservação', paiId: 'despesas_administrativas', meta: { papelDRE: 'despesa_operacional', atividadeDFC: 'operacional', regime: 'dre' } },
      { id: 'inv_imobilizado', nome: 'Aquisição de Imobilizado', paiId: 'investimento_dfc', meta: { atividadeDFC: 'investimento' } },
    ]
    const out = aplicarCapexPadrao(salvo)
    expect(out[0]!.meta).toMatchObject({ capex: 'manutencao', regime: 'dre', papelDRE: 'despesa_operacional' })
    expect(out[1]!.meta).toMatchObject({ capex: 'investimento', atividadeDFC: 'investimento' })
  })

  it('capex: null (opt-out explícito) e capex já definido são respeitados', () => {
    const salvo: No[] = [
      { id: 'adm_manutencao', nome: 'Manutenção', paiId: null, meta: { papelDRE: 'despesa_operacional', capex: null } },
      { id: 'inv_imobilizado', nome: 'Imobilizado', paiId: null, meta: { atividadeDFC: 'investimento', capex: 'manutencao' } },
    ]
    const out = aplicarCapexPadrao(salvo)
    expect(out[0]!.meta?.capex).toBeNull()
    expect(out[1]!.meta?.capex).toBe('manutencao')
  })

  it('id custom (fora do plano padrão) não é tocado', () => {
    const salvo: No[] = [{ id: 'uuid-custom', nome: 'Meu grupo', paiId: null }]
    expect(aplicarCapexPadrao(salvo)[0]!.meta).toBeUndefined()
  })
})
