/**
 * @file Cenário vivo da ENTRADA (v3.1): os orbs difusos que respiram atrás do card.
 *
 * A linha de EKG e o piso de radar saíram DAQUI porque o Login.tsx passou a renderizar os
 * seus próprios (`.lp-ekg-tela` e `.lp-piso`, na gramática do RH). Ficaram duplicados: dois
 * pisos empilhados em alturas diferentes, e uma linha de EKG que nem chegava a renderizar
 * (largura 0). Um cenário, um dono — este componente agora só cuida dos orbs.
 */
export function CenaPulso() {
  return (
    <div className="login-cena pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <span className="orbe orbe-a" />
      <span className="orbe orbe-b" />
    </div>
  )
}
