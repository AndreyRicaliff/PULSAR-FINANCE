/**
 * @file Normalização do roteiro + detecção de TRABALHO NÃO SALVO.
 *
 * Por que existe: o roteiro em edição (painel_estado, chave `cliente:<id>:apresentacao-v2`,
 * UM por empresa) e a apresentação salva (painel_apresentacoes, uma linha) são dois
 * documentos distintos. Abrir uma apresentação copia linha → roteiro, destrutivamente.
 *
 * Até 07/08 o guard dessa cópia perguntava "é outro card?" (`abertaId !== item.id`). Ele
 * errava justamente nos dois caminhos mais comuns: reabrir o MESMO card, e voltar à aba
 * depois de o componente remontar (aí `abertaId` já é null e o confirm se auto-aprovava).
 * Resultado em produção: 3 das 6 empresas com roteiro salvo ficaram no tamanho exato do
 * padrão vazio — 10 slides, zero texto. Trabalho de fechamento sobrescrito em silêncio.
 *
 * A pergunta certa não é sobre identidade, é sobre conteúdo: "existe no roteiro algo que
 * não está salvo em lugar nenhum?". Daí assinatura, não id.
 */
import { ROTEIRO_PADRAO, type EstadoApresentacao, type SlideItem } from '@/components/apresentacao/tipos'

/** Boundary do documento: doc do banco/backup com shape defasado não pode quebrar o roteiro. */
export function normalizarApresentacao(bruto: unknown): EstadoApresentacao {
  const e = (bruto ?? {}) as Partial<EstadoApresentacao>
  return {
    capa: { titulo: '', subtitulo: '', elaboradoPor: 'AG Consultoria', ...e.capa },
    roteiro: e.roteiro?.length ? e.roteiro : ROTEIRO_PADRAO,
    periodo: { de: e.periodo?.de ?? null, ate: e.periodo?.ate ?? null },
    // null = herda o tema padrão da EMPRESA (ficha); só a escolha explícita viaja aqui.
    tema: e.tema ?? null,
  }
}

/**
 * Estado de uma apresentação recém-criada. Existe para o INSERT gravar o roteiro padrão em
 * vez de `{}`: apresentação criada e não salva ficava vazia no banco para sempre (HOPE PIZZAS,
 * 04/08) e o card dizia "nova · 0 slides" mesmo depois de editada na tela.
 */
export const estadoInicialApresentacao = (): EstadoApresentacao => normalizarApresentacao(null)

const CAMPO = ''
const SLIDE = ''

/**
 * Serialização EXPLÍCITA, campo a campo — nunca `JSON.stringify` do objeto cru. Os dois lados
 * da comparação têm origens diferentes (spread em memória × `JSON.parse` do Postgres) e a
 * ordem das chaves não é garantida entre elas; comparar o JSON bruto acusaria diferença onde
 * não há, e o analista levaria um confirm a cada clique até parar de ler o aviso.
 * `?? ''` porque `normalizar` não desce nos slides: doc antigo pode não ter `observacao`.
 */
const assinarSlide = (s: SlideItem): string =>
  s.tipo === 'livre'
    ? ['livre', s.id, s.titulo ?? '', s.argumento ?? '', s.anexo ?? ''].join(CAMPO)
    : ['secao', s.secao, s.titulo ?? '', s.argumento ?? '', s.observacao ?? ''].join(CAMPO)

/** Assinatura do conteúdo EDITÁVEL do roteiro. Igual = nada a perder na sobrescrita. */
export function assinar(e: EstadoApresentacao): string {
  return [
    e.capa.titulo,
    e.capa.subtitulo,
    e.capa.elaboradoPor,
    e.periodo.de ?? '',
    e.periodo.ate ?? '',
    e.tema ?? '',
    ...e.roteiro.map(assinarSlide),
  ].join(SLIDE)
}

const ASSINATURA_VAZIA = assinar(estadoInicialApresentacao())

/**
 * O roteiro saiu do padrão — existe trabalho do analista aqui.
 *
 * "Tem texto" não serve de teste: o padrão já nasce com 10 slides e 4 títulos preenchidos.
 * O que caracteriza trabalho é DIFERIR do padrão.
 */
export function temTrabalho(e: EstadoApresentacao): boolean {
  return assinar(e) !== ASSINATURA_VAZIA
}

/**
 * `emEdicao` tem conteúdo que sumiria ao carregar `alvoBruto` por cima?
 *
 * Roteiro ainda pristino devolve `false` de propósito: o padrão já vem com 10 slides e 4
 * títulos preenchidos, então "tem texto" não serve de teste — o que vale é DIFERIR do padrão.
 * Sem isso, toda primeira abertura da sessão pediria confirmação à toa.
 */
export function perdeTrabalho(emEdicao: EstadoApresentacao, alvoBruto: unknown): boolean {
  const atual = assinar(emEdicao)
  if (atual === ASSINATURA_VAZIA) return false
  return atual !== assinar(normalizarApresentacao(alvoBruto))
}
