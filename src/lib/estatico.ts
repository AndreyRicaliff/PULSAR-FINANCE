/**
 * @file Modo estático — o ÚNICO jeito de desligar movimento neste app (§4 da v3.1).
 *
 * `prefers-reduced-motion` NÃO é usado como gate: no Windows/RDP o sistema liga essa
 * preferência sozinho, e o usuário real ficava com a tela morta sem ter pedido nada
 * (bug pago 2× nesta máquina). Quem quer parado abre com `?static=1`.
 *
 * O atributo é escrito por um script inline no index.html (antes do paint); aqui só lemos —
 * uma fonte de verdade, sem divergência entre CSS e JS.
 */
export const MODO_ESTATICO =
  typeof document !== 'undefined' && document.documentElement.hasAttribute('data-static')
