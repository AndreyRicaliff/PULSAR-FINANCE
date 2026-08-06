-- Apresentações — versão automática por (cliente, competência).
--
-- Report 2026-08-06: "erro de duplicidade que não existe". Reproduzido em prod:
--   insert ... titulo='TESTE OUTRO NOME'  ->
--   ERROR 23505: duplicate key value violates unique constraint "apresentacao_versao_unica"
--   DETAIL: Key (cliente_id, competencia, versao)=(bcd73ea3..., 2026-08, 1) already exists.
--
-- Causa: `versao` tem default 1 e o front nunca a informa; `competencia` nasce sempre no mês
-- corrente. Logo a SEGUNDA apresentação de qualquer cliente no mesmo mês colide — mesmo com
-- título diferente. Do ponto de vista do operador não há duplicata alguma: ele criou "Fechamento
-- ago/26" e depois "Prévia do conselho", dois documentos distintos.
--
-- A unique está CERTA (v1, v2 do mesmo fechamento é o modelo do domínio) — o que faltava era
-- alguém atribuir a versão. Fica no banco, não no front: calcular no cliente exige um round-trip
-- de leitura e ainda assim corre. Aqui o max() roda dentro da transação do INSERT, e a unique
-- permanece como backstop.

create or replace function public.numerar_versao_apresentacao()
returns trigger
language plpgsql
as $$
begin
  -- Só numera quando o chamador NÃO escolheu explicitamente (default da coluna = 1).
  -- Um insert que informe versao=7 de propósito continua respeitado.
  if new.versao is null or new.versao = 1 then
    select coalesce(max(a.versao), 0) + 1 into new.versao
    from public.painel_apresentacoes a
    where a.cliente_id = new.cliente_id
      and a.competencia = new.competencia;
  end if;
  return new;
end;
$$;

-- BEFORE INSERT e antes do congelamento (ordem alfabetica dos triggers: "apresentacao_congela_*"
-- roda depois de "apresentacao_atribui_*"), entao publicado_em continua carimbado pelo servidor.
drop trigger if exists apresentacao_atribui_versao on public.painel_apresentacoes;
create trigger apresentacao_atribui_versao
before insert on public.painel_apresentacoes
for each row execute function public.numerar_versao_apresentacao();

comment on column public.painel_apresentacoes.versao is
  'Versao dentro de (cliente, competencia). Atribuida pelo trigger quando o insert nao informa.';
