/**
 * @file A abertura do HUD: a resposta antes da ferramenta.
 *
 * O cliente caía direto nos indicadores — corretos, mas que exigem interpretação de quem
 * abre o painel para saber "como foi o mês". Aqui a frase vem primeiro, e os três números
 * que a sustentam vêm logo abaixo: entrou, saiu, sobrou. O resto do HUD vira aprofundamento.
 *
 * Coreografia (§padrao-atrativo): entra 1× com stagger de 70ms, número-mestre com count-up,
 * repouso PARADO. Nada aqui pisca em loop.
 */
import { calcularManchete, type Manchete } from '@/core/manchete'
import { hojeLocalIso } from '@/core/periodo'
import { brl } from '@/lib/money'
import { useContagem } from '@/lib/useContagem'
import { useResultado } from '@/lib/useResultado'

export function MancheteCliente() {
  const { serieContinua } = useResultado()
  // Série CONTÍNUA e não a do período: a manchete é sobre o último mês fechado da operação,
  // independente do recorte que o cliente deixou no filtro.
  const manchete = calcularManchete(serieContinua, hojeLocalIso().slice(0, 7))
  if (!manchete) return <SemMesFechado />
  return <Cartao m={manchete} />
}

function Cartao({ m }: { m: Manchete }) {
  const saldo = useContagem(brl(Math.abs(m.saldoCentavos)))
  const cor = m.tom === 'positivo' ? 'text-accent' : m.tom === 'negativo' ? 'text-danger' : 'text-text'
  return (
    <section className="anim-fade-up overflow-hidden rounded-card border border-bd bg-surface">
      <div className="flex flex-col gap-1 border-b border-bd/60 px-6 py-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Seu mês</span>
        <p className="text-[19px] font-semibold leading-snug text-text">{m.frase}</p>
      </div>

      {/* O stagger vive AQUI: `.anim-stagger` escalona os filhos DIRETOS (nth-child), então
          precisa envolver os três blocos, não o cartão inteiro. */}
      <div className="anim-stagger flex flex-wrap items-end gap-x-10 gap-y-5 px-6 py-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-muted">
            {m.tom === 'negativo' ? 'Faltou' : 'Sobrou'} em {m.periodo}
          </span>
          {/* tabular-nums é obrigatório com count-up: sem ele o número dança de largura. */}
          <strong className={`text-3xl font-bold tabular-nums ${cor}`}>
            {m.tom === 'negativo' ? '-' : ''}
            {saldo}
          </strong>
        </div>
        <Ancora rotulo="Entrou" valor={m.entradaCentavos} cor="text-accent" />
        <Ancora rotulo="Saiu" valor={m.saidaCentavos} cor="text-danger" />
      </div>
    </section>
  )
}

function Ancora({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  const texto = useContagem(brl(valor))
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted">{rotulo}</span>
      <span className={`text-lg font-semibold tabular-nums ${cor}`}>{texto}</span>
    </div>
  )
}

/**
 * Mês corrente ainda aberto: dizer isso é melhor que mostrar um número parcial com cara de
 * fechamento — e melhor ainda que não mostrar nada e parecer quebrado.
 */
function SemMesFechado() {
  return (
    <section className="rounded-card border border-dashed border-bd bg-surface px-6 py-5">
      <p className="text-sm text-muted">
        O resumo do mês aparece aqui assim que o primeiro mês fechar. Enquanto isso, os números
        abaixo já mostram o movimento em andamento.
      </p>
    </section>
  )
}
