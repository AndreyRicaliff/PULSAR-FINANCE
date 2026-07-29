/**
 * @file Ícones da navegação (§6): traço 1.6, 18px, herdam a cor do item — os glifos
 * tipográficos da versão anterior (☰ ≣ ◷ ◑) não tinham peso consistente entre si nem
 * acompanhavam a cor no hover. Desenho mínimo: 2–4 traços por ícone, sem preenchimento.
 */
import type { Aba } from './Sidebar.tsx'

const COMUM = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

const DESENHOS: Readonly<Record<Aba, readonly string[]>> = {
  // Captura
  cadastro: ['M4 7h16', 'M4 12h16', 'M4 17h10'],
  plano: ['M4 6h6', 'M4 12h10', 'M4 18h14', 'M18 4v4', 'M16 6h4'],
  valores: ['M3 12h4l2-5 3 10 2.5-7 1.5 2h5'],
  fornecedores: ['M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M3 20a6 6 0 0 1 12 0', 'M17 8h4', 'M19 6v4'],
  pagar: ['M12 19V5', 'M6 11l6-6 6 6'],
  receber: ['M12 5v14', 'M6 13l6 6 6-6'],
  // Lápis: lançamento digitado à mão (fora do banco).
  manuais: ['M4 20l4-1L19 8l-3-3L5 16l-1 4Z', 'M13 7l3 3'],
  // Selo com check: conta aprovada pelo cliente.
  aprovacoes: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M8.5 12.5l2.5 2.5 4.5-5'],
  // Camada semântica
  modelo: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  demonstracoes: ['M6 3h8l4 4v14H6z', 'M14 3v4h4', 'M9 13h6', 'M9 17h4'],
  projecao: ['M3 17l5-5 3 3 7-8', 'M15 7h4v4'],
  // Camada analítica
  relatorios: ['M5 20V10', 'M12 20V4', 'M19 20v-7'],
  apresentacao: ['M3 4h18v11H3z', 'M12 15v5', 'M8 20h8'],
  hud: ['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z', 'M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'],
  // Configuração
  acessos: ['M15.5 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M13 10.5L4 19.5', 'M7 16.5l2 2', 'M10 13.5l2 2'],
  config: ['M4 7h10', 'M18 7h2', 'M4 17h4', 'M12 17h8', 'M16 5v4', 'M10 15v4'],
}

export function IconeNav({ aba }: { aba: Aba }) {
  return (
    <svg {...COMUM}>
      {DESENHOS[aba].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
