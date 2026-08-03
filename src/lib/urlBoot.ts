/**
 * @file Fotografia da URL no BOOT, antes de qualquer outro módulo rodar.
 *
 * O supabase-js (detectSessionInUrl) consome e APAGA o hash do link de recuperação assim
 * que o cliente é criado. Ler `window.location.hash` lá no componente virava corrida:
 * em aparelho rápido o hash já tinha sumido quando o React montava, o app não sabia que
 * era convite e jogava o usuário no gate do 2FA sem senha definida ("não leva pro fluxo
 * correto em ALGUNS dispositivos", report 03/08). Aqui a leitura acontece uma vez, cedo.
 *
 * Precisa ser o PRIMEIRO import do main.tsx — módulo sem dependências, avaliado antes.
 */
const hash = typeof window === 'undefined' ? '' : window.location.hash
const search = typeof window === 'undefined' ? '' : window.location.search

export const URL_BOOT = {
  hash,
  search,
  /** Retorno do link de convite/recuperação (fluxo implícito do GoTrue). */
  recuperacao: /type=recovery/.test(hash),
  /** Link morto/queimado: o GoTrue devolve o erro no hash. */
  linkExpirado: /error_code=otp_expired|error=access_denied/.test(hash),
  /** Página intermediária anti-scanner: ?convite=<verify-url>. */
  convite: new URLSearchParams(search).get('convite'),
} as const
