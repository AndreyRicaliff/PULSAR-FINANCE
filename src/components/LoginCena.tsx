/**
 * @file Cenário vivo da ENTRADA (v3.1): orbs difusos + linha de EKG atravessando + piso de
 * radar 3D. Este é o cenário que o PULSAR-RH copiou do Finance ("espelha o login do
 * Finance", index.html do RH) — o v3 sóbrio o aposentou junto com o interior, e a v3.1 o
 * traz de volta SÓ na porta: o escopo `.login-cena` religa display/animação por cima do
 * neutralizador (ver index.css), então nada disso volta a existir dentro do sistema.
 */
export function CenaPulso() {
  return (
    <div className="login-cena pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <span className="orbe orbe-a" />
      <span className="orbe orbe-b" />

      <div className="ekg-ambiente">
        <svg viewBox="0 0 1400 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="ekgAmb" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#7048E8" stopOpacity="0" />
              <stop offset="0.2" stopColor="#7048E8" stopOpacity="0.9" />
              <stop offset="0.5" stopColor="#A55EFF" />
              <stop offset="0.8" stopColor="#9B6EFF" stopOpacity="0.9" />
              <stop offset="1" stopColor="#9B6EFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 50 H240 H320 L340 42 L360 50 L374 26 L388 74 L402 50 H480 H700 H920 H970 L998 42 L1014 50 L1028 26 L1042 74 L1056 50 H1160 H1400"
            stroke="url(#ekgAmb)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      <div className="pulso-piso">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
