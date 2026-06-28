/** @file Slideshow da apresentação: capa (intro) + um slide por seção, navegável por setas/teclado. */
import { useEffect, useState } from 'react'
import { rotuloIntervalo } from '@/core/periodo'
import { useClientes } from '@/lib/clientes'
import { PeriodoProvider } from '@/lib/periodo'
import { snapshotApresentacao } from '@/lib/apresentacaoSnapshot'
import { useApresentacao } from '@/lib/useApresentacao'
import { useResultado } from '@/lib/useResultado'
import { Capa } from './Capa.tsx'
import { ConteudoSecao } from './ConteudoSecao.tsx'
import { Slide, SlideLivre } from './Slide.tsx'
import { ROTULO_SECAO } from './tipos'

export function Slideshow() {
  return (
    <PeriodoProvider>
      <Conteudo />
    </PeriodoProvider>
  )
}

function dataGeracao(): string {
  const iso = snapshotApresentacao()?.geradoEm
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleDateString('pt-BR')
}

function Conteudo() {
  const { ativo } = useClientes()
  const { estado } = useApresentacao()
  const { periodo } = useResultado()
  const [i, setI] = useState(0)

  const total = estado.roteiro.length + 1 // +1 = capa
  const data = dataGeracao()
  const periodoTxt = rotuloIntervalo(periodo.intervalo)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') setI((v) => Math.min(v + 1, total - 1))
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setI((v) => Math.max(v - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total])

  const item = i > 0 ? estado.roteiro[i - 1] : null
  const comum = { numero: i + 1, total, cliente: ativo.nome, data }

  return (
    <div className="ag-slideshow h-screen overflow-hidden bg-[#1A1A1A]">
      {i === 0 ? (
        <Capa titulo={estado.capa.titulo} subtitulo={estado.capa.subtitulo} elaboradoPor={estado.capa.elaboradoPor} cliente={ativo.nome} periodo={periodoTxt} data={data} />
      ) : item?.tipo === 'secao' ? (
        <Slide {...comum} titulo={item.titulo || ROTULO_SECAO[item.secao]} argumento={item.argumento} observacao={item.observacao}>
          <ConteudoSecao secao={item.secao} />
        </Slide>
      ) : item?.tipo === 'livre' ? (
        <SlideLivre {...comum} titulo={item.titulo} argumento={item.argumento} anexo={item.anexo} />
      ) : null}

      <Navegacao i={i} total={total} onIr={(n) => setI(Math.max(0, Math.min(n, total - 1)))} />
    </div>
  )
}

function Navegacao({ i, total, onIr }: { i: number; total: number; onIr: (n: number) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-[#F2B100]/40 bg-[#161616] px-3 py-1.5 shadow-lg">
      <button type="button" onClick={() => onIr(i - 1)} disabled={i === 0} className="rounded-full px-2 text-lg text-[#F2B100] disabled:opacity-30" title="Anterior (←)">
        ‹
      </button>
      <span className="text-xs font-semibold tabular-nums text-white">
        {i + 1} / {total}
      </span>
      <button type="button" onClick={() => onIr(i + 1)} disabled={i === total - 1} className="rounded-full px-2 text-lg text-[#F2B100] disabled:opacity-30" title="Próximo (→)">
        ›
      </button>
    </div>
  )
}
