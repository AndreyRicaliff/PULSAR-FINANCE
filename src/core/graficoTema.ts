/**
 * @file Tokens do desenho dos gráficos — a gramática destilada do dashboard do Beto
 * (`beto-motobike-backend/apps/estoque-web/src/components/charts`), que é o padrão de
 * legibilidade validado com cliente (pedido 06/08: "deixe no tema de beto os gráficos").
 *
 * O que veio de lá: TIPOGRAFIA maior nos eixos (10,5/11 contra os 8,5/9 daqui — 8,5px é
 * ilegível em tela de trabalho, e era a mesma queixa do contraste), área em gradiente
 * discreto, crosshair CINZA TRACEJADO em vez de linha sólida colorida (a linha da série
 * é o dado; a mira é ferramenta, não pode competir), ponto ativo com halo e referência
 * sempre tracejada em cinza — média/meta é leitura do dado, não um segundo dado.
 *
 * O que NÃO veio: a paleta. O Beto é vermelho/azul sobre claro, de outro cliente; as cores
 * daqui continuam saindo dos tokens Pulsar. Copiar a paleta trocaria a marca de dono.
 */

/** Tamanhos em px dentro do viewBox do SVG. */
export const FONTE_GRAFICO = {
  /** Valores do eixo Y. */
  eixoY: 10.5,
  /** Rótulos do eixo X (meses, categorias). */
  eixoX: 11,
  /** Anotação sobre o desenho (média, extremos). */
  nota: 10,
  /** Sparkline e gráficos em miniatura, onde não há espaço. */
  mini: 8.5,
} as const

/** Gradiente da área sob a linha: presença sem peso — o dado é a linha, não o preenchimento. */
export const AREA_OPACIDADE = { topo: 0.16, base: 0.01 } as const

/** Mira do hover: cinza tracejado. Nunca na cor da série — competiria com o dado. */
export const CROSSHAIR = { traco: '3 3', largura: 1, opacidade: 0.55 } as const

/** Linha de referência (média, meta, orçado): tracejada e neutra, por ser leitura do dado. */
export const REFERENCIA = { traco: '5 4', largura: 1.4 } as const

/** Acima disto, ponto por marcação vira poeira — a linha basta. */
export const MAX_PONTOS_VISIVEIS = 40
