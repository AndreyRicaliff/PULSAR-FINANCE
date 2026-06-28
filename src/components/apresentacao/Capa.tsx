/** @file Capa (intro) da apresentação — tema ACME: fundo preto, acentos amarelos. */
const AMARELO = '#F2B100'
const PRETO = '#161616'

export function Capa({
  titulo,
  subtitulo,
  cliente,
  periodo,
  data,
}: {
  titulo: string
  subtitulo: string
  elaboradoPor: string
  cliente: string
  periodo: string
  data: string
}) {
  return (
    <section
      className="anim-fade flex h-screen w-full flex-col items-center justify-center px-8 text-center text-white"
      style={{ background: `linear-gradient(160deg, ${PRETO}, #000)` }}
    >
      <div className="anim-pop text-4xl font-extrabold tracking-tight" style={{ color: AMARELO }}>
        {cliente}
      </div>
      <div className="mt-10 text-xs font-semibold uppercase tracking-[0.4em] text-white/60">Relatório Financeiro</div>
      <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
        {titulo || `Relatório Financeiro — ${cliente}`}
      </h1>
      {subtitulo ? <p className="mt-3 max-w-2xl text-lg italic text-white/70">{subtitulo}</p> : null}

      <div className="mt-10 w-full max-w-md rounded-xl border px-6 py-5 text-sm text-white/85" style={{ borderColor: `${AMARELO}55` }}>
        <p>
          <span className="font-semibold" style={{ color: AMARELO }}>Período:</span> {periodo}
        </p>
        <p className="mt-1.5">
          <span className="font-semibold" style={{ color: AMARELO }}>Data:</span> {data}
        </p>
      </div>

      <p className="mt-12 text-sm font-semibold" style={{ color: AMARELO }}>
        feito por AG Consultoria
      </p>
      <p className="mt-1 text-[11px] text-white/40">Use as setas ← → para navegar</p>
    </section>
  )
}
