-- Apresentações — FASE 0b: congelar de verdade a linha publicada.
--
-- Achado de auditoria adversarial (2026-07-24), reproduzido em prod: o check
-- `apresentacao_publicada_tem_numeros_ck` garante a PRESENÇA de `numeros`, nunca a
-- IMUTABILIDADE. Um `update ... set numeros='{"receita":999999}' where status='publicada'`
-- passava e reescrevia o que já tinha sido entregue ao cliente — exatamente o cenário que
-- o congelamento existe para impedir. A garantia era comportamental (o front não faria isso);
-- agora é estrutural.
--
-- Regra: linha publicada só anda para 'arquivada', e nenhum campo do entregável muda.
-- Reabrir para rascunho é proibido — o caminho é publicar uma versão nova.

alter table public.painel_apresentacoes
  add column if not exists publicado_por uuid references auth.users(id) on delete set null;

create or replace function public.congelar_apresentacao_publicada()
returns trigger
language plpgsql
as $$
begin
  -- INSERT: carimba a publicacao no servidor (OLD nao existe aqui).
  if tg_op = 'INSERT' then
    if new.status = 'publicada' and new.publicado_em is null then
      new.publicado_em := now();
    end if;
    return new;
  end if;

  -- UPDATE: o carimbo e' do servidor, nunca do front.
  if new.status = 'publicada' and old.status is distinct from 'publicada' then
    new.publicado_em := now();
  elsif new.status = 'rascunho' and old.status is distinct from 'rascunho' then
    new.publicado_em := null;
  end if;

  if old.status = 'publicada' then
    if new.status = 'rascunho' then
      raise exception 'apresentacao publicada nao reabre; publique uma nova versao (id=%)', old.id
        using errcode = 'check_violation';
    end if;
    if new.numeros      is distinct from old.numeros
    or new.conteudo     is distinct from old.conteudo
    or new.titulo       is distinct from old.titulo
    or new.competencia  is distinct from old.competencia
    or new.versao       is distinct from old.versao
    or new.cliente_id   is distinct from old.cliente_id
    or new.publicado_em is distinct from old.publicado_em then
      raise exception 'apresentacao publicada e imutavel; so a transicao publicada->arquivada e permitida (id=%)', old.id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists apresentacao_congela_publicada on public.painel_apresentacoes;
create trigger apresentacao_congela_publicada
before insert or update on public.painel_apresentacoes
for each row execute function public.congelar_apresentacao_publicada();

comment on column public.painel_apresentacoes.numeros is
  'Agregados (DRE/DFC/KPIs) do mes. Obrigatorio para publicar e IMUTAVEL apos a publicacao (trigger).';
comment on column public.painel_apresentacoes.publicado_por is
  'Quem publicou (pode diferir de criado_por quando analista publica rascunho de outro).';
