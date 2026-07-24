-- Provedor visível ao front (rótulo de UI).
--
-- A fonte de verdade do provedor é `painel_credenciais.provedor`, que é service-role-only
-- (o browser não pode lê-la, e não deve). Sem isso a UI escrevia "Omie" fixo em ~30 textos
-- e mentia para o cliente Nibo. A coluna aqui é uma PROJEÇÃO read-only mantida por trigger:
-- ninguém escreve nela à mão, então não há drift possível entre as duas tabelas.

alter table public.painel_clientes add column if not exists provedor text;

do $$ begin
  alter table public.painel_clientes
    add constraint painel_clientes_provedor_ck
    check (provedor is null or provedor in ('omie', 'nibo'));
exception when duplicate_object then null; end $$;

comment on column public.painel_clientes.provedor is
  'Projeção de painel_credenciais.provedor (mantida por trigger). NULL = cliente sem integração.';

create or replace function public.espelhar_provedor_no_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update painel_clientes set provedor = null where id::text = old.client_id;
    return old;
  end if;
  update painel_clientes set provedor = new.provedor where id::text = new.client_id;
  return new;
end;
$$;

drop trigger if exists painel_credenciais_espelha_provedor on public.painel_credenciais;
create trigger painel_credenciais_espelha_provedor
after insert or update or delete on public.painel_credenciais
for each row execute function public.espelhar_provedor_no_cliente();

-- Backfill dos clientes já cadastrados.
update public.painel_clientes c
   set provedor = k.provedor
  from public.painel_credenciais k
 where k.client_id = c.id::text
   and c.provedor is distinct from k.provedor;
