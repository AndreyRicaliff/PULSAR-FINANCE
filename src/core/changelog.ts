/**
 * @file Log de atualizações do produto (§7). Arquivo versionado no repo — deploya junto,
 * sem tabela nem fetch.
 *
 * Disciplina editorial: escrever o BENEFÍCIO, nunca o commit. "Fechamento ficou 2× mais
 * rápido", jamais "refactor do hook X". 1–5 entradas por mês. Sem jargão — quem lê é o
 * time financeiro, não quem escreveu o código.
 */
export type TagChangelog = 'novo' | 'melhoria' | 'correcao'

export interface EntradaChangelog {
  /** 'aaaa-mm-dd' */
  readonly data: string
  readonly tag: TagChangelog
  /** ≤ 60 caracteres. */
  readonly titulo: string
  /** Uma linha, focada no benefício. */
  readonly desc: string
}

export const ROTULO_TAG: Readonly<Record<TagChangelog, string>> = {
  novo: 'Novo',
  melhoria: 'Melhoria',
  correcao: 'Correção',
}

/** Mais recentes primeiro — a ordem é responsabilidade de quem edita. */
export const CHANGELOG: readonly EntradaChangelog[] = [
  {
    data: '2026-07-24',
    tag: 'correcao',
    titulo: 'Arrastar categoria para um grupo voltou a funcionar',
    desc: 'Dá para soltar a categoria em cima do grupo inteiro, e o botão "conciliar em…" abre normalmente.',
  },
  {
    data: '2026-07-24',
    tag: 'melhoria',
    titulo: 'Nome de categoria sem o código na frente',
    desc: 'A lista mostra só o nome; o código aparece ao lado apenas quando dois nomes se repetem.',
  },
  {
    data: '2026-07-23',
    tag: 'correcao',
    titulo: 'Renomear categoria agora salva de verdade',
    desc: 'As edições de nome eram gravadas num cliente errado e sumiam; as que se perderam foram recuperadas.',
  },
  {
    data: '2026-07-22',
    tag: 'novo',
    titulo: 'Clientes do Nibo entram no painel',
    desc: 'Empresas que usam Nibo sincronizam igual às do Omie, com DRE e fluxo de caixa completos.',
  },
]

/** Data da entrada mais recente — base do aviso de não-lido. */
export const ULTIMA_ATUALIZACAO: string = CHANGELOG.reduce(
  (maior, e) => (e.data > maior ? e.data : maior),
  '',
)
