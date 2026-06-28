/** @file Sanitização mínima do HTML do editor rico: mantém só tags de formatação, sem atributos. */

const TAGS_OK = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'P', 'BR', 'UL', 'OL', 'LI', 'SPAN', 'DIV', 'A', 'H3', 'H4',
  'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'CAPTION',
])

function limpar(no: Element): void {
  for (const filho of [...no.children]) {
    if (!TAGS_OK.has(filho.tagName)) {
      filho.replaceWith(...filho.childNodes) // desembrulha tag proibida (ex.: script), preserva o texto
      continue
    }
    for (const attr of [...filho.attributes]) filho.removeAttribute(attr.name) // tira on*, style, href…
    limpar(filho)
  }
}

/** Remove tags não-permitidas e todos os atributos (anti-XSS) do HTML colado/editado. */
export function sanitizarHtml(bruto: string): string {
  const doc = new DOMParser().parseFromString(`<body>${bruto}</body>`, 'text/html')
  limpar(doc.body)
  return doc.body.innerHTML
}
