-- APLICADO EM PROD 2026-08-03 (via Management API) — registro do que já está no ar.
--
-- O convite por e-mail real NUNCA funcionou: o GoTrue insere a linha em auth.users ANTES
-- de aplicar o app_metadata customizado do admin.createUser, então o trigger BEFORE INSERT
-- `bloquear_signup_fora_ag` jamais via o marcador convite_ag e bloqueava TODO convite com
-- "signup restrito..." (reproduzido empiricamente 03/08: admin.createUser com
-- app_metadata {convite_ag:'1'} → P0001; após o drop → criado com sucesso).
--
-- O bloqueio de signup público já é (e continua) responsabilidade do GoTrue nativo:
-- Auth config `disable_signup = true` (verificado ativo; POST /auth/v1/signup com anon key
-- devolve "Signups not allowed for this instance"). A Admin API (service_role) ignora o
-- disable_signup por design — exatamente o que manage-user e convidar-acesso precisam.
--
-- REVERSÃO (se algum dia precisar do trigger de volta — NÃO recomendado, reintroduz o bug):
--   create function public.bloquear_signup_fora_ag() returns trigger ... (ver git deste arquivo)
--   create trigger bloquear_signup_fora_ag before insert on auth.users
--     for each row execute function bloquear_signup_fora_ag();

drop trigger if exists bloquear_signup_fora_ag on auth.users;
drop function if exists public.bloquear_signup_fora_ag();
