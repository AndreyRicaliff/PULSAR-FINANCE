# Plano — Apresentações mensais por cliente ("mini drive")

Status: **PLANEJADO** (2026-07-24). Nada implementado.

## O problema, medido

Hoje a Apresentação é **um único rascunho vivo por cliente** (`painel_estado`, chave
`cliente:<id>:apresentacao-v2`): capa + roteiro + observações. Não tem competência, não tem
histórico, não tem publicação. Editar julho **apaga** o que foi dito em junho.

Medição em prod (25 clientes):

| | |
|---|---|
| Snapshot completo de 1 cliente | média **512 kB**, maior **1,5 MB** |
| Desse total, dado CRU do ERP (`*-raw`) | **98,7%** (12 MB de 12,2 MB) |
| Trabalho da AG (modelo, overrides, roteiro) | **1,3%** (162 kB no total) |

**A conclusão que define a arquitetura:** guardar "a apresentação do mês" copiando o
snapshot inteiro seria duplicar 98,7% de dado que já existe e que é o mesmo em todo mês.

## Decisão central — congelar o RESULTADO, nunca a matéria-prima

Uma apresentação mensal tem 3 camadas com ciclos de vida diferentes:

| Camada | Muda | Peso | Onde vive |
|---|---|---|---|
| 1. Texto do analista (capa, roteiro, observações) | muito | ~5–10 kB | **novo: `conteudo`** |
| 2. Números do mês (DRE, DFC, KPIs já calculados) | congela no fechamento | ~10–30 kB | **novo: `numeros`** |
| 3. Movimentos crus do ERP | a cada sync | 512 kB | já em `painel_estado` — **não copiar** |

**Por que congelar os números (2) e não recalcular na hora:** reclassificar uma categoria
ou re-sincronizar o ERP muda o passado. A apresentação de junho que o cliente recebeu tem
que continuar mostrando o que foi entregue — senão o cliente reabre o arquivo em setembro
e o número mudou. Congelar o agregado (~30 kB) dá imutabilidade sem duplicar 512 kB.

## Custo comparado (o cálculo pedido)

24 clientes × 12 meses = 288 apresentações/ano:

| Abordagem | Por apresentação | Ano | vs ótimo |
|---|---|---|---|
| Copiar snapshot completo em JSONB | 512 kB | **150 MB** | 17× |
| Guardar o HTML renderizado em Storage | ~1,5–2 MB *(estimado: bundle 700 kB + fonte + snapshot)* | **~500 MB** | 55× |
| **Agregados + texto (recomendado)** | **~30 kB** | **~9 MB** | — |

O HTML entregável **não precisa ser guardado**: ele é regenerável a partir de
`numeros` + `conteudo` a qualquer momento. Guarda-se a fonte da verdade (30 kB), o artefato
(2 MB) se reconstrói no clique de "baixar".

## Estrutura de dados

Tabela nova — **não** `painel_estado`. Razão concreta: a RLS de `painel_estado` dá ao
cliente leitura de TODO o prefixo `cliente:<id>:%`, então ele veria rascunho não publicado.
Controle de publicação exige linha própria com `status`.

```sql
create table painel_apresentacoes (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references painel_clientes(id) on delete cascade,
  competencia   text not null,                    -- 'YYYY-MM' (a "pasta do mês")
  versao        int  not null default 1,
  status        text not null default 'rascunho'
                check (status in ('rascunho','publicada','arquivada')),
  titulo        text,
  conteudo      jsonb not null default '{}',      -- capa + roteiro + observações
  numeros       jsonb,                            -- agregados congelados (null enquanto rascunho)
  criado_por    uuid references auth.users(id),
  publicado_em  timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (cliente_id, competencia, versao)
);

-- No máximo UMA publicada por cliente/mês; republicar arquiva a anterior e sobe a versão.
create unique index apresentacao_publicada_unica
  on painel_apresentacoes (cliente_id, competencia) where status = 'publicada';

create index on painel_apresentacoes (cliente_id, competencia desc);
```

`versao` + `arquivada` dão o histórico de revisões sem tabela extra: "o que o cliente
recebeu em 12/07" continua recuperável depois de uma correção.

## Controle do administrador (RLS)

```sql
-- operador (e analista da carteira, quando a Fase 3 do PLANO_MULTI_ACESSO existir): tudo
-- cliente: só o que foi PUBLICADO para ele
create policy apresentacao_cliente_le on painel_apresentacoes for select
using (
  eh_operador(auth.uid())
  or (status = 'publicada'
      and cliente_id in (select cid from cliente_ids_do_usuario(auth.uid())))
);
```

Nada chega ao cliente enquanto o operador não clicar em **Publicar** — que é literalmente
o que "controlado pelo adm" significa. Rascunho e versões arquivadas ficam invisíveis.

## Otimização independente: o HTML exportado hoje é gordo demais

`apresentacaoAutonoma.ts:20` embute **todos** os `painel_estado` do cliente — o período é
só filtro de visualização, não de dado. Uma apresentação de um mês carrega os 11.666
movimentos do ESPETINHO. Filtrar o snapshot pela competência corta ~90% do arquivo
(~1,5 MB → ~150 kB) e vale mesmo sem o resto deste plano.

## Fases

| # | Entrega | Verificação |
|---|---|---|
| **0** | Migration da tabela + RLS + índices. Sem front. | RLS simulada por JWT: cliente não vê rascunho; vê publicada; operador vê tudo. |
| **1** | Aba **Apresentações**: lista por mês (o "drive"), criar/editar rascunho, observações por slide. Migra o `apresentacao-v2` atual para a competência corrente. | Criar 2 meses no mesmo cliente e editar um sem afetar o outro. |
| **2** | **Publicar**: congela `numeros` (DRE/DFC/KPIs do período) + `publicado_em`; republicar arquiva e versiona. | Publicar, reclassificar uma categoria, reabrir a publicada → número **não** muda. É o teste que prova a imutabilidade. |
| **3** | Cliente vê no HUD a lista de meses publicados (só leitura) + download do HTML regenerado. | Logado como AUTAG: vê publicada, não vê rascunho. |
| **4** | *(Opcional)* Arquivo imutável em Storage no publish, bucket privado + signed URL, snapshot filtrado pelo mês. | Só se houver exigência de "arquivo idêntico ao entregue". |

Esforço: F0 ½ dia · F1 1–2 dias · F2 1 dia · F3 ½ dia · F4 ½ dia.

## Decisões registradas

- **Tabela dedicada, não `painel_estado`** — a RLS por prefixo não sabe distinguir rascunho
  de publicado; listagem/ordenação por mês exigiria parsear chave.
- **Congelar agregados, não movimentos** — 30 kB vs 512 kB, e é o agregado que precisa ser
  imutável, não a matéria-prima.
- **Não guardar o HTML** — regenerável; guardar 2 MB do que se reconstrói de 30 kB é
  desperdício de 55×. Exceção só se exigirem prova documental do arquivo entregue (F4).
- **`versao` + `arquivada` em vez de tabela de histórico** — mesma garantia, menos peça.

## Risco de tamanho que a estimativa de 30 kB NÃO cobre: anexos

`SlideLivre.anexo` (`components/apresentacao/tipos.ts`) é **imagem embutida como data URL**.
Hoje nenhum cliente usa (docs de 1–7 kB, `tem_anexo = false` nos 3 existentes), mas **uma
única foto colada vira 0,5–2 MB dentro do `conteudo` jsonb** — 30× a estimativa da linha
inteira e um tiro no pé quando o realtime do outro plano assinar a tabela.

Mitigação na F1: anexo vai para **Supabase Storage** (`apresentacoes/<cliente>/<competencia>/`)
e o `conteudo` guarda só a URL; ou, no mínimo, teto de tamanho + recompressão no upload.
Decidir antes de liberar anexo na UI — depois de ter dado gravado, é migração.

## Achado lateral

`apresentacao-comentarios-v1` existe em 2 clientes em prod mas **nenhum código referencia**
— resíduo de versão anterior. Limpar junto com o lixo de fuzzing já listado no PENDENCIAS.
