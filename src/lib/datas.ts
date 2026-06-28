/** @file Formatação de data/hora pt-BR compartilhada pela UI. */
export function dataHora(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}
