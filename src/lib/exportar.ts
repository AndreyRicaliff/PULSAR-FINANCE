/**
 * @file Exportação CSV das demonstrações — separador ';' e decimal com vírgula (Excel pt-BR),
 * BOM UTF-8 para acentuação abrir certa no Excel.
 */

export interface LinhaExportavel {
  readonly nome: string
  readonly valorCentavos: number
}

export function csvDemonstracao(linhas: readonly LinhaExportavel[]): string {
  const cab = 'Linha;Valor (R$)'
  const corpo = linhas.map((l) => `${aspas(l.nome)};${decimal(l.valorCentavos)}`)
  return [cab, ...corpo].join('\r\n')
}

function decimal(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}

function aspas(s: string): string {
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function baixarCsv(nome: string, conteudo: string): void {
  const blob = new Blob([`﻿${conteudo}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}
