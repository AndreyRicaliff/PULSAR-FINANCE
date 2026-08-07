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
import { calcularLinhaCaixa, type LinhaCaixa } from '@/core/caixaCliente'
import { calcularManchete, type Manchete } from '@/core/manchete'
import { hojeLocalIso } from '@/core/periodo'
import { brl } from '@/lib/money'
import { useMovimentos } from '@/lib/movimentos'
import { useContagem } from '@/lib/useContagem'
import { useResultado } from '@/lib/useResultado'
import { useSaldosIniciais } from '@/lib/useSaldosIniciais'

export function MancheteCliente({ sincronizadoEm }: { sincronizadoEm?: string }) {
  const { serieContinua } = useResultado()
  // TODOS os movimentos, não os do recorte: título a vencer semana que vem está fora de
  // qualquer período passado que o cliente tenha deixado no filtro.
  const { movimentos: todos } = useMovimentos()
  const { saldos } = useSaldosIniciais()
  const hoje = hojeLocalIso()
  // `mes in saldos`, não `?? 0`: saldo ZERO informado é um saldo real e gera cobertura;
  // saldo NÃO informado não pode fingir cobertura nenhuma (regra 1 do núcleo).
  const mes = hoje.slice(0, 7)
  const saldoMes = mes in saldos ? saldos[mes]! : null
  const caixa = calcularLinhaCaixa(todos, saldoMes, hoje)

  // Série CONTÍNUA e não a do período: a manchete é sobre o último mês fechado da operação,
  // independente do recorte que o cliente deixou no filtro.
  const manchete = calcularManchete(serieContinua, hoje.slice(0, 7))
  if (!manchete) return <SemMesFechado />
  return <Cartao m={manchete} caixa={caixa} sincronizadoEm={sincronizadoEm} />
}

function Cartao({ m, caixa, sincronizadoEm }: { m: Manchete; caixa: LinhaCaixa | null; sincronizadoEm?: string }) {
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
      {caixa ? <RodapeCaixa caixa={caixa} sincronizadoEm={sincronizadoEm} /> : null}
    </section>
  )
}

const COR_TOM: Readonly<Record<LinhaCaixa['tom'], string>> = {
  positivo: 'text-accent',
  atencao: 'text-warn',
  negativo: 'text-danger',
  neutro: 'text-muted',
}

/**
 * A segunda pergunta ("posso pagar as contas?") como rodapé VISIVELMENTE secundário —
 * decisão de 07/08: empilhar sem diluir a manchete. Tipografia menor, sem count-up, sem
 * stagger: o palco é do resultado. E este número é operacional: muda todo dia e depende da
 * conciliação — por isso o carimbo de quando é a sincronização, em vez de cara de eterno.
 */
function RodapeCaixa({ caixa, sincronizadoEm }: { caixa: LinhaCaixa; sincronizadoEm?: string }) {
  const quando = sincronizadoEm
    ? new Date(sincronizadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : null
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-bd/60 bg-surface2/40 px-6 py-3">
      <p className={`text-[13px] font-medium ${COR_TOM[caixa.tom]}`}>{caixa.frase}</p>
      <span className="flex flex-wrap items-baseline gap-x-4 text-[11px] tabular-nums text-muted">
        {caixa.disponivelCentavos !== null ? <span>caixa hoje {brl(caixa.disponivelCentavos)}</span> : null}
        {caixa.aPagarCentavos > 0 ? <span>a pagar 30d {brl(caixa.aPagarCentavos)}</span> : null}
        {caixa.aReceberCentavos > 0 ? <span>a receber 30d {brl(caixa.aReceberCentavos)}</span> : null}
        {quando ? <span>· sincronizado em {quando}</span> : null}
      </span>
    </div>
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
