/**
 * @file Regressão do mock da Apresentação offline (report 2026-08-05: HTML exportado abria
 * em BRANCO). Causa: o mock enumerava métodos e o app cresceu — onAuthStateChange (2FA) e
 * .is() (lançamentos manuais) viravam TypeError no boot. Estes testes reproduzem as cadeias
 * REAIS do boot do modo apresentação; método novo no app não pode mais matar o export.
 */
import { describe, expect, it } from 'vitest'
import type { SnapshotApresentacao } from './apresentacaoSnapshot'
import { clienteMock } from './supabase'

const TENANT = { id: 't1', nome: 'Acme', documento: null, ativo: true, provedor: 'omie' as const }
const snap: SnapshotApresentacao = {
  clienteAtivoId: 't1',
  clientes: [TENANT],
  estado: { 'cliente:t1:apresentacao-v2': { roteiro: [{ tipo: 'livre', id: 'x', titulo: 'T', argumento: '' }] } },
  geradoEm: '2026-08-06T00:00:00.000Z',
}

describe('clienteMock (modo apresentação)', () => {
  it('auth expõe onAuthStateChange inerte — boot do use2FA/useAuth não explode', () => {
    const mock = clienteMock(snap)
    const { data } = mock.auth.onAuthStateChange(() => {})
    expect(typeof data.subscription.unsubscribe).toBe('function')
    data.subscription.unsubscribe()
  })

  it('cadeia dos lançamentos manuais (.is + .order duplo) resolve lista vazia', async () => {
    const mock = clienteMock(snap)
    const r = await mock
      .from('painel_lancamentos_manuais')
      .select('id')
      .eq('cliente_id', 't1')
      .is('removido_em', null)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false })
    expect(r).toEqual({ data: [], error: null })
  })

  it('método DESCONHECIDO continua encadeável (à prova de API futura)', async () => {
    const mock = clienteMock(snap)
    const q = mock.from('painel_qualquer') as unknown as Record<string, (...a: unknown[]) => unknown>
    const r = await (q.select!('x') as unknown as Record<string, (...a: unknown[]) => unknown>).metodoQueNaoExiste!()
    expect(r).toEqual({ data: [], error: null })
  })

  it('painel_estado por chave serve o snapshot (persistencia/movimentos)', async () => {
    const mock = clienteMock(snap)
    const { data } = await mock
      .from('painel_estado')
      .select('dados')
      .eq('chave', 'cliente:t1:apresentacao-v2')
      .maybeSingle()
    expect((data as { dados: { roteiro: unknown[] } }).dados.roteiro).toHaveLength(1)
  })

  it('painel_clientes lista os tenants do snapshot', async () => {
    const mock = clienteMock(snap)
    const { data } = await mock.from('painel_clientes').select('*')
    expect(data).toEqual([TENANT])
  })

  it('rpc e functions.invoke devolvem erro nomeado em vez de explodir', async () => {
    const mock = clienteMock(snap)
    const r1 = await mock.rpc('decidir_aprovacao', {})
    const r2 = await mock.functions.invoke('sync-omie', {})
    expect(r1.error?.message).toMatch(/apresentação/)
    expect(r2.error?.message).toMatch(/apresentação/)
  })

  it('mutações são no-op {error:null} (apresentação é read-only)', async () => {
    const mock = clienteMock(snap)
    const r = await mock.from('painel_estado').upsert({ chave: 'k', dados: {} })
    expect(r).toEqual({ error: null })
  })
})
