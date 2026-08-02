/**
 * @file Detector de conciliação órfã — a promessa do produto é "conciliar uma vez";
 * quando o BPO reestrutura o plano no ERP (Omie troca o código posicional; categoria some),
 * a classificação passa a apontar para uma chave que não existe mais e os movimentos voltam
 * ao "a conciliar" EM SILÊNCIO. Detectar é o que transforma retrabalho invisível em aviso.
 * Achado real: AUTAG 36 tinha '2.04.89 → cv_csp' órfã em prod (2026-07-23).
 */
import type { Categoria } from './categoria'
import { chaveMovFilial } from './filial'
import type { Dimensao, Modelo } from './modelo'
import { chaveContraparte, type Movimento } from './movimento'

export interface Orfa {
  readonly dimensao: Dimensao
  /** Chave do mapa que não referencia mais nada (código de categoria, contraparte ou movimento). */
  readonly chave: string
  /** Nó da estrutura para onde ela apontava. */
  readonly noId: string
  /** 'chave' = o código sumiu do ERP; 'no' = o grupo de destino sumiu da estrutura. */
  readonly motivo: 'chave' | 'no'
}

/** Baldes estáveis por construção — nunca são órfãos. */
const PSEUDO = new Set(['SEM_CATEGORIA', 'SEM'])

/**
 * Chaves do mapa que não existem mais no cadastro nem nos movimentos atuais.
 * `contas` valida contra categorias E movimentos (categoria fora do cadastro mas ainda
 * lançada não é órfã — só ilegível); `fornecedores`/`centros` contra os movimentos.
 */
export function orfasDaConciliacao(
  modelo: Modelo,
  categorias: readonly Categoria[],
  movimentos: readonly Movimento[],
): readonly Orfa[] {
  const catVivas = new Set<string>(categorias.map((c) => c.codigo))
  const catLancadas = new Set<string>()
  const contrapartes = new Set<string>()
  const chavesMov = new Set<string>()
  for (const m of movimentos) {
    catLancadas.add(m.categoria)
    contrapartes.add(chaveContraparte(m))
    chavesMov.add(chaveMovFilial(m))
  }

  const viva = (dim: Dimensao, chave: string): boolean => {
    if (PSEUDO.has(chave)) return true
    if (dim === 'contas') return catVivas.has(chave) || catLancadas.has(chave)
    if (dim === 'fornecedores') return contrapartes.has(chave)
    return chavesMov.has(chave)
  }

  const orfas: Orfa[] = []
  for (const dimensao of ['contas', 'fornecedores', 'centros'] as const) {
    // Nó de destino sumido ("Restaurar estrutura padrão" preserva o mapa; lote da matriz
    // pode gravar id-semente inexistente): o item some das DUAS colunas sem este aviso.
    // Só contas/fornecedores — a estrutura de centros é injetada do cadastro em runtime
    // (chega depois da hidratação) e a checagem daria falso positivo transitório.
    const nos = dimensao === 'centros' ? null : new Set(modelo[dimensao].estrutura.map((n) => n.id))
    for (const [chave, noId] of Object.entries(modelo[dimensao].mapa)) {
      if (nos && !nos.has(noId)) orfas.push({ dimensao, chave, noId, motivo: 'no' })
      else if (!viva(dimensao, chave)) orfas.push({ dimensao, chave, noId, motivo: 'chave' })
    }
  }
  return orfas
}
