/**
 * @file Guarda a autossuficiência do HTML offline da apresentação.
 *
 * O artefato entregue ao cliente é UM arquivo: `montarHtmlAutonomo` embute os `script[src]`
 * do index.html e não tem como buscar chunk pela rede — aberto por `file://`, qualquer
 * requisição morre. Isso já produziu tela branca uma vez (05/08).
 *
 * Desde o code-splitting dos painéis (07/08) o app EMITE chunks sob demanda, e o que mantém
 * o offline íntegro é uma garantia do bundler: tudo alcançável ESTATICAMENTE a partir do
 * entry fica no chunk do entry. O Slideshow é importado estaticamente pelo App, então o
 * grafo dele viaja junto — desde que ninguém introduza um `import()` dentro desse grafo.
 *
 * Este teste é a única coisa que impede essa regressão: `tsc` não vê diferença entre import
 * estático e dinâmico, e o build passa limpo dos dois jeitos. O estrago só aparece na mão do
 * cliente, num arquivo que já saiu por e-mail.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = join(process.cwd(), 'src', 'components')

/** O que o Slideshow renderiza: as próprias telas de slide e os relatórios que elas embutem. */
const PASTAS_DO_SLIDESHOW = ['apresentacao', 'relatorios']
/** Painéis puxados por ConteudoSecao — no grafo do Slideshow apesar de morarem na raiz. */
const ARQUIVOS_DO_SLIDESHOW = ['IndicadoresPanel.tsx', 'ProjecaoPanel.tsx']

function fontesEm(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return fontesEm(caminho)
    return /\.tsx?$/.test(nome) && !nome.includes('.test.') ? [caminho] : []
  })
}

// `import(` precedido de espaço/início/= — evita casar `useApresentacao(` e afins.
const IMPORT_DINAMICO = /(^|[^.\w])import\s*\(/m

describe('HTML offline da apresentação continua autossuficiente', () => {
  const alvos = [
    ...PASTAS_DO_SLIDESHOW.flatMap((p) => fontesEm(join(RAIZ, p))),
    ...ARQUIVOS_DO_SLIDESHOW.map((f) => join(RAIZ, f)),
  ]

  it('encontra os arquivos que precisa vigiar (guarda contra o teste virar no-op)', () => {
    expect(alvos.length).toBeGreaterThan(20)
  })

  it.each(alvos.map((a) => [a.slice(RAIZ.length + 1), a]))(
    'sem import() dinâmico em %s',
    (_rotulo, caminho) => {
      expect(IMPORT_DINAMICO.test(readFileSync(caminho, 'utf8'))).toBe(false)
    },
  )
})
