begin;

-- Create the member and their registration atomically: validation failures
-- cannot leave a partial member or bypass capacity and queue priority.
create function public.volei_admin_register_player(p_event uuid,p_name text,p_phone text,p_birth_date date)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; player public.volei_members; registration text;
begin
  if not coalesce(public.is_volei_admin(),false) then raise exception 'Acesso restrito.'; end if;
  select * into ev from public.volei_events where id=p_event for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  if ev.presence_closed_at is not null then raise exception 'A presença deste jogo já foi concluída.'; end if;
  if p_name is null or char_length(trim(p_name)) not between 2 and 100 then raise exception 'Informe o nome completo.'; end if;
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Informe um telefone válido com DDD.'; end if;
  if p_birth_date is null or p_birth_date < date '1900-01-01' or p_birth_date > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Informe uma data de nascimento válida.';
  end if;
  insert into public.volei_members(name,phone,birth_date,membership_status)
    values(trim(p_name),p_phone,p_birth_date,'approved') returning * into player;
  perform public.volei_respond(p_event,player.id,'confirmado');
  select status into registration from public.volei_attendance where event_id=p_event and member_id=player.id;
  return jsonb_build_object('id',player.id,'name',player.name,'status',registration);
end $$;
revoke all on function public.volei_admin_register_player(uuid,text,text,date) from public,anon;
grant execute on function public.volei_admin_register_player(uuid,text,text,date) to authenticated;

notify pgrst, 'reload schema';
commit;
