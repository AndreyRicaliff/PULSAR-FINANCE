import { z } from 'zod'

const envSchema = z.object({
  OMIE_APP_KEY: z.string().min(1),
  OMIE_APP_SECRET: z.string().min(1),
  OMIE_BASE_URL: z.string().url().default('https://app.omie.com.br/api/v1'),
})

export type OmieConfig = z.infer<typeof envSchema>

export function loadOmieConfig(env: NodeJS.ProcessEnv): OmieConfig {
  const parsed = envSchema.safeParse(env)
  if (parsed.success) return parsed.data
  const faltando = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
  throw new Error(`Config Omie inválida — verifique o .env: ${faltando}`)
}
