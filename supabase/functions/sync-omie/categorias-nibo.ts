// @ts-nocheck — mesmo regime do index.ts (código do ambiente Deno, sem tipos no tsc do app)
// Síntese do plano de contas NIBO — funções PURAS da edge, extraídas do index.ts para
// serem cobertas pelo vitest (src/core/categorias-nibo.test.ts). Sem I/O, sem APIs Deno.

// Gêmeos locais de index.ts (obj/str) — o index tem side effects de runtime e não pode
// ser importado pelos testes.
const obj = (v) => (v && typeof v === 'object' ? v : {})
const str = (v) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')

export const naturezaNibo = (t) => {
  const s = str(t).toLowerCase()
  if (s === 'in' || /receita|receb|credit/.test(s)) return 'receita'
  if (s === 'out' || /despesa|pag|debit/.test(s)) return 'despesa'
  return 'outra'
}

// Plano NIBO tem 3 NÍVEIS (validado com dado real 2026-07-22): group → subgroup → categoria.
// O Omie traz isso embutido no código ('1.01.02'); aqui vem em campos separados, então as
// agrupadoras são sintetizadas — sem isso o Plano de Contas perderia o nível do subgrupo.
export function mapearCategoriasNibo(brutas) {
  const grupos = new Map()
  const subs = new Map()
  const cats = brutas.map((c) => {
    const g = obj(c.group)
    const gid = str(g.id), sid = str(c.subgroupId)
    const nat = naturezaNibo(c.type)
    if (gid && !grupos.has(gid)) grupos.set(gid, { nome: str(g.name), nat })
    if (sid && !subs.has(sid)) subs.set(sid, { nome: str(c.subgroupName), pai: gid || null, nat })
    return {
      codigo: str(c.id), descricao: str(c.name), natureza: nat,
      paiCodigo: sid || gid || null, agrupadora: false, ativa: true, entraNoDre: true,
    }
  })
  const agrupadora = (codigo, descricao, natureza, paiCodigo) => ({
    codigo, descricao, natureza, paiCodigo, agrupadora: true, ativa: true, entraNoDre: false,
  })
  return [
    ...[...grupos].map(([id, g]) => agrupadora(id, g.nome, g.nat, null)),
    ...[...subs].map(([id, s]) => agrupadora(id, s.nome, s.nat, s.pai)),
    ...cats,
  ]
}

// /categories NÃO devolve categorias arquivadas que os schedules ainda referenciam (52 de 95
// na 1ª carga real). O próprio schedule carrega categoryName/parent — completamos o cadastro
// AQUI, na ingestão; sem isso o GUID cru vazaria como nome na tela (pendência 2026-07-14).
export function completarCategoriasComSchedules(categorias, schedules) {
  const existentes = new Set(categorias.map((c) => c.codigo))
  const extras = new Map(), pais = new Map()
  for (const s of schedules) {
    for (const bruta of s.categories ?? []) {
      const c = obj(bruta)
      const id = str(c.categoryId)
      if (!id || existentes.has(id) || extras.has(id)) continue
      const paiId = str(c.parentId)
      // O rateio TRAZ `type` próprio ('in'/'out' — payload real conferido 2026-08-07; a
      // auditoria supôs ausente e errou). Fallback pro sinal do schedule (Credit/Debit)
      // caso o campo suma um dia — nunca despejar as arquivadas em 'outra'.
      extras.set(id, {
        codigo: id, descricao: str(c.categoryName) || id, natureza: naturezaNibo(str(c.type) || s.type),
        paiCodigo: paiId || null, agrupadora: false, ativa: true, entraNoDre: true,
      })
      if (paiId && !existentes.has(paiId) && !pais.has(paiId)) {
        pais.set(paiId, {
          codigo: paiId, descricao: str(c.parent) || paiId, natureza: naturezaNibo(str(c.type) || s.type),
          paiCodigo: null, agrupadora: true, ativa: true, entraNoDre: false,
        })
      }
    }
  }
  return [...categorias, ...pais.values(), ...extras.values()]
}

// Natureza de agrupadora pela PREDOMINANTE das filhas — pegar a "primeira filha" classificava
// "Receitas operacionais" como despesa (pego na 1ª carga real). Grupo é cabeçalho: o que vale
// é o que a maioria das analíticas abaixo dele é.
export function ajustarNaturezaAgrupadoras(categorias) {
  const porPai = new Map()
  for (const c of categorias) {
    if (c.agrupadora || !c.paiCodigo) continue
    const cont = porPai.get(c.paiCodigo) ?? {}
    cont[c.natureza] = (cont[c.natureza] ?? 0) + 1
    porPai.set(c.paiCodigo, cont)
  }
  return categorias.map((c) => {
    if (!c.agrupadora) return c
    const cont = porPai.get(c.codigo)
    if (!cont) return c
    const [predominante] = Object.entries(cont).sort((a, b) => b[1] - a[1])[0]
    return { ...c, natureza: predominante }
  })
}
