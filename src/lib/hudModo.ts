/** @file Modo HUD do cliente: painel apresentativo read-only (DRE/DFC/detalhamento) via ?hud na URL. */

/** true quando a URL tem ?hud — entrega o HUD do cliente em tela cheia, sem o shell do operador. */
export const MODO_HUD =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('hud')
