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

const AG_CLASSICO: TemaApresentacao = { id: 'ag-classico', nome: 'AG Clássico', acento: '#F2B100', escuro: '#161616', palco: '#1A1A1A' }

export const TEMAS_APRESENTACAO: readonly TemaApresentacao[] = [
  AG_CLASSICO,
  { id: 'pulsar', nome: 'Pulsar', acento: '#7048E8', escuro: '#14102A', palco: '#0E0E16' },
  { id: 'esmeralda', nome: 'Esmeralda', acento: '#0E8A5F', escuro: '#0E1F19', palco: '#0B1512' },
  { id: 'safira', nome: 'Safira', acento: '#2F6FDE', escuro: '#101B2E', palco: '#0B1220' },
  { id: 'vinho', nome: 'Vinho', acento: '#B4304A', escuro: '#23121A', palco: '#170C11' },
  { id: 'grafite', nome: 'Grafite', acento: '#9BA1AC', escuro: '#1C1C1E', palco: '#121214' },
]

export const TEMA_PADRAO_ID = 'ag-classico'

export function temaPorId(id: string | null | undefined): TemaApresentacao {
  return TEMAS_APRESENTACAO.find((t) => t.id === id) ?? AG_CLASSICO
}

/** Tema efetivo: o do arquivo vence; sem ele, o padrão da empresa; sem ambos, clássico. */
export function temaEfetivo(daApresentacao: string | null | undefined, daEmpresa: string | null | undefined): TemaApresentacao {
  return temaPorId(daApresentacao ?? daEmpresa ?? TEMA_PADRAO_ID)
}

/** Vars CSS que o palco/capa/slides consomem (inline no root — cascata pros filhos). */
export function varsDoTema(t: TemaApresentacao): Record<string, string> {
  return { '--ap-acento': t.acento, '--ap-escuro': t.escuro, '--ap-palco': t.palco }
}
