/**
 * @file Temas curados da apresentação — presets fechados, não color-picker: slide de
 * cliente sai bonito em qualquer escolha. Resolução: tema da APRESENTAÇÃO (viaja no
 * arquivo da biblioteca) ?? tema padrão da EMPRESA (ficha) ?? clássico AG.
 */

export interface TemaApresentacao {
  readonly id: string
  readonly nome: string
  /** Cor de destaque (títulos, marcadores, barra de navegação). */
  readonly acento: string
  /** Escuro da identidade (capa, rodapés). */
  readonly escuro: string
  /** Fundo do palco (a moldura atrás dos slides). */
  readonly palco: string
}

// Correção de batismo (2026-07-30): o dourado/preto é a identidade da AUTAG; o padrão
// da CASA é o roxo Pulsar. O id 'ag-classico' segue resolvendo pro dourado — apresentações
// salvas com ele não mudam de cara.
const PULSAR: TemaApresentacao = { id: 'pulsar', nome: 'Pulsar (padrão AG)', acento: '#7048E8', escuro: '#14102A', palco: '#0E0E16' }

export const TEMAS_APRESENTACAO: readonly TemaApresentacao[] = [
  PULSAR,
  { id: 'autag', nome: 'AUTAG', acento: '#F2B100', escuro: '#161616', palco: '#1A1A1A' },
  { id: 'esmeralda', nome: 'Esmeralda', acento: '#0E8A5F', escuro: '#0E1F19', palco: '#0B1512' },
  { id: 'safira', nome: 'Safira', acento: '#2F6FDE', escuro: '#101B2E', palco: '#0B1220' },
  { id: 'vinho', nome: 'Vinho', acento: '#B4304A', escuro: '#23121A', palco: '#170C11' },
  { id: 'grafite', nome: 'Grafite', acento: '#9BA1AC', escuro: '#1C1C1E', palco: '#121214' },
]

export const TEMA_PADRAO_ID = 'pulsar'

/** ids antigos → atuais (arquivo salvo não quebra com rebatismo). */
const APELIDOS: Readonly<Record<string, string>> = { 'ag-classico': 'autag' }

/** Resolve id em tema, considerando também os temas CUSTOM da empresa (ficha). */
export function temaPorId(id: string | null | undefined, extras: readonly TemaApresentacao[] = []): TemaApresentacao {
  const alvo = APELIDOS[id ?? ''] ?? id
  return extras.find((t) => t.id === alvo) ?? TEMAS_APRESENTACAO.find((t) => t.id === alvo) ?? PULSAR
}

/** Tema efetivo: o do arquivo vence; sem ele, o padrão da empresa; sem ambos, Pulsar. */
export function temaEfetivo(
  daApresentacao: string | null | undefined,
  daEmpresa: string | null | undefined,
  extras: readonly TemaApresentacao[] = [],
): TemaApresentacao {
  return temaPorId(daApresentacao ?? daEmpresa ?? TEMA_PADRAO_ID, extras)
}

/** Vars CSS que o palco/capa/slides consomem (inline no root — cascata pros filhos). */
export function varsDoTema(t: TemaApresentacao): Record<string, string> {
  return { '--ap-acento': t.acento, '--ap-escuro': t.escuro, '--ap-palco': t.palco }
}
