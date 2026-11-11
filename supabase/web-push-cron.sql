-- Run separately, only after deployment, the Web Push migration and Vault setup.
-- Enable pg_cron and pg_net through the Supabase dashboard first.
-- In Vault, create volei_web_push_cron_secret with the SAME value as the
-- Vercel VOLEI_WEB_PUSH_CRON_SECRET. Never put the real secret in this file.
begin;
do $$
begin
 if to_regnamespace('cron') is null or to_regnamespace('net') is null then
  raise exception 'Ative pg_cron e pg_net no painel do Supabase antes de agendar.';
 end if;
 if not exists(select 1 from vault.decrypted_secrets where name='volei_web_push_cron_secret' and length(decrypted_secret)>=32) then
  raise exception 'Cadastre volei_web_push_cron_secret no Vault antes de agendar.';
 end if;
end $$;
select cron.schedule('volei-web-push','* * * * *', $job$
 delete from public.volei_web_push_outbox where created_at<now()-interval '7 days';
 delete from public.volei_web_push_subscriptions where expires_at<=now();
 delete from cron.job_run_details where jobid=(select jobid from cron.job where jobname='volei-web-push') and end_time < now()-interval '7 days';
 select net.http_get(
  url:='https://duarte-apps.vercel.app/api/admin/volei/web-push-dispatch',
  headers:=jsonb_build_object('Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='volei_web_push_cron_secret')),
  timeout_milliseconds:=55000
 ) where exists (
  select 1 from public.volei_web_push_outbox o
  join public.volei_web_push_subscriptions s on s.id=o.subscription_id
  join public.volei_admins a on a.user_id=s.user_id
  where s.expires_at>now() and o.created_at>now()-interval '24 hours' and o.attempts<5
  and ((o.status='pending' and o.next_attempt_at<=now()) or (o.status='processing' and o.claimed_at<now()-interval '5 minutes'))
 );
$job$);
commit;
-- To stop this job later: select cron.unschedule('volei-web-push');
-- cron history confirms SQL execution, not HTTP delivery. Check the status_code
-- in net._http_response and the private outbox status to diagnose delivery.
