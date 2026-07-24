/**
 * @file Count-up do número-mestre (§4): 620ms, ease-out cúbico, 1× na entrada.
 *
 * Anima sobre o texto JÁ FORMATADO (ex.: "R$ 1.234.567,89", "12,5%") preservando prefixo,
 * sufixo e o número de casas decimais — reformatar por conta própria quebraria o padrão
 * pt-BR que o resto do app usa. Sem número reconhecível (ex.: "—" do fail-closed §8.4),
 * devolve o texto intacto: o traço nunca vira 0 contando.
 *
 * O par `tabular-nums` é obrigatório em quem consome isto, senão o valor dança de largura
 * enquanto conta.
 */
import { useEffect, useRef, useState } from 'react'
import { MODO_ESTATICO } from './estatico'

const DURACAO = 620

/** Casa o primeiro número pt-BR do texto: milhar com ponto, decimal com vírgula. */
const RE_NUMERO = /-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?/

interface Partes {
  readonly antes: string
  readonly depois: string
  readonly valor: number
  readonly casas: number
}

function separar(texto: string): Partes | null {
  const m = RE_NUMERO.exec(texto)
  if (!m) return null
  const cru = m[0]
  const [inteiro = '', decimal = ''] = cru.split(',')
  const valor = Number(`${inteiro.replace(/\./g, '')}.${decimal || '0'}`)
  if (!Number.isFinite(valor)) return null
  return {
    antes: texto.slice(0, m.index),
    depois: texto.slice(m.index + cru.length),
    valor,
    casas: decimal.length,
  }
}

const formatar = (v: number, casas: number): string =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export function useContagem(texto: string): string {
  const [saida, setSaida] = useState(texto)
  const raf = useRef(0)

  useEffect(() => {
    const partes = separar(texto)
    // Sem número (ou modo estático): mostra o texto final, sem contar.
    if (!partes || MODO_ESTATICO) {
      setSaida(texto)
      return
    }
    const inicio = performance.now()
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / DURACAO)
      const eased = 1 - (1 - t) ** 3
      setSaida(`${partes.antes}${formatar(partes.valor * eased, partes.casas)}${partes.depois}`)
      if (t < 1) raf.current = requestAnimationFrame(passo)
      else setSaida(texto) // fecha exatamente no texto original, sem erro de arredondamento
    }
    raf.current = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf.current)
  }, [texto])

  return saida
}
