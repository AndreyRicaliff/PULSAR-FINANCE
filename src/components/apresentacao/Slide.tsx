/** @file Casca de um slide (tema ACME: amarelo + preto): header/footer, título, argumento e observação. */
import type { ReactNode } from 'react'

const AMARELO = '#F2B100'
const PRETO = '#161616'

function Cabecalho({ cliente, data }: { cliente: string; data: string }) {
  return (
    <header className="flex items-center justify-between px-12 py-3 text-white" style={{ backgroundColor: PRETO }}>
      <span className="text-lg font-extrabold tracking-tight">
        {cliente} <span style={{ color: AMARELO }}>·</span> <span className="text-sm font-semibold text-white/70">Relatório Financeiro</span>
      </span>
      <span className="text-[11px] text-white/60">{data}</span>
    </header>
  )
}

function Rodape({ numero, total }: { numero: number; total: number }) {
  return (
    <footer className="flex items-center justify-between px-12 py-2.5 text-[11px] text-white/70" style={{ backgroundColor: PRETO }}>
      <span className="font-semibold" style={{ color: AMARELO }}>feito por AG Consultoria</span>
      <span className="tabular-nums">
        {numero} / {total}
      </span>
    </footer>
  )
}

function CaixaArgumento({ html }: { html: string }) {
  return (
    <div
      className="mb-6 rounded-r-lg border-l-4 bg-[#FFF7E0] px-5 py-4 text-[15px] leading-relaxed text-[#2A2206] [&_ul]:list-disc [&_ul]:pl-5"
      style={{ borderColor: AMARELO }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function CaixaObservacao({ texto }: { texto: string }) {
  return (
    <div className="mt-6 rounded-r-lg border-l-4 border-[#161616]/40 bg-[#161616]/[0.04] px-5 py-3 text-sm text-[#3A3320]">
      <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#7A6A2A]">Observação</div>
      <p className="whitespace-pre-wrap leading-relaxed">{texto}</p>
    </div>
  )
}

/** Slide livre: título + argumento rico em página inteira (sem componente de dado). */
export function SlideLivre({
  titulo,
  numero,
  total,
  cliente,
  data,
  argumento,
  anexo,
}: {
  titulo: string
  numero: number
  total: number
  cliente: string
  data: string
  argumento: string
  anexo?: string
}) {
  return (
    <section className="mx-auto flex h-screen w-full max-w-[1600px] flex-col bg-white text-[#161616]">
      <Cabecalho cliente={cliente} data={data} />
      <div className="flex-1 overflow-y-auto px-12 py-10">
        {titulo ? (
          <>
            <h2 className="text-3xl font-extrabold">{titulo}</h2>
            <div className="mb-6 mt-2 h-1 w-24 rounded" style={{ backgroundColor: AMARELO }} />
          </>
        ) : null}
        <div
          className="text-[16px] leading-relaxed [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-bold [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#EAD79A] [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-[#EAD79A] [&_th]:bg-[#FFF7E0] [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: argumento || '<p style="color:#9a8a4a">Argumento livre…</p>' }}
        />
        {anexo ? <img src={anexo} alt="anexo" className="mt-6 max-h-[60vh] w-auto rounded-lg border border-[#EAD79A]" /> : null}
      </div>
      <Rodape numero={numero} total={total} />
    </section>
  )
}

export function Slide({
  titulo,
  numero,
  total,
  cliente,
  data,
  argumento,
  observacao,
  children,
}: {
  titulo: string
  numero: number
  total: number
  cliente: string
  data: string
  argumento: string
  observacao: string
  children: ReactNode
}) {
  return (
    <section className="mx-auto flex h-screen w-full max-w-[1600px] flex-col bg-white text-[#161616]">
      <Cabecalho cliente={cliente} data={data} />
      <div className="flex-1 overflow-y-auto px-12 py-8">
        <h2 className="text-2xl font-extrabold">{titulo}</h2>
        <div className="mb-5 mt-1.5 h-1 w-24 rounded" style={{ backgroundColor: AMARELO }} />
        {argumento ? <CaixaArgumento html={argumento} /> : null}
        <div className="ag-slide-conteudo">{children}</div>
        {observacao ? <CaixaObservacao texto={observacao} /> : null}
      </div>
      <Rodape numero={numero} total={total} />
    </section>
  )
}
