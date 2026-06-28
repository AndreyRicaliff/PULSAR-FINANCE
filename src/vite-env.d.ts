/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Carimbo do build (data/hora) injetado pelo Vite (define) — confirma o deploy ativo. */
declare const __BUILD_TIME__: string
