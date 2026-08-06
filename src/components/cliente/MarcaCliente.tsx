/**
 * @file A marca no topo do painel do cliente.
 *
 * Com logo cadastrado, o painel passa a ser DELE — é o que faz parecer produto próprio em vez
 * de ferramenta emprestada do contador. A AG não some: assina embaixo, discreta. Convivência e
 * não substituição, porque o serviço prestado também precisa ter dono visível (decisão 06/08).
 *
 * Sem logo, cai no comportamento anterior (marca Pulsar) — nenhum cliente existente muda de
 * cara sem alguém decidir isso no cadastro.
 */
import { useClientes } from '@/lib/clientes'
import { useFicha } from '@/lib/ficha'
import { Logo } from '../Logo.tsx'

export function MarcaCliente({ size = 30 }: { size?: number }) {
  const { ficha } = useFicha()
  const { ativo } = useClientes()
  if (!ficha.logo) return <Logo size={size} />
  return (
    <div className="flex flex-col gap-1.5">
      <img
        src={ficha.logo}
        alt={ficha.exibicao || ativo.nome}
        className="block w-auto object-contain"
        style={{ maxHeight: size * 1.4, maxWidth: '100%' }}
      />
      <span className="text-[10px] leading-none text-muted/80">por AG Consultoria</span>
    </div>
  )
}
