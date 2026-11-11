-- Apply once, after 202610290001, in the authoritative web migration history.
begin;

create function public.volei_admin_cancel_registration(p_event uuid,p_member uuid,p_guest uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare ev public.volei_events; current_status text; arrival timestamptz;
begin
 if not coalesce(public.is_volei_admin(),false) then raise exception 'Acesso restrito.'; end if;
 select * into ev from public.volei_events where id=p_event for update;
 if not found then raise exception 'Jogo não encontrado.'; end if;
 if ev.presence_closed_at is not null then raise exception 'A presença deste jogo já foi concluída.'; end if;

 if p_guest is not null then
  select status,checked_in_at into current_status,arrival from public.volei_guests
   where event_id=p_event and member_id=p_member and id=p_guest for update;
  if not found then raise exception 'Convidado não encontrado neste jogo.'; end if;
 else
  select status,checked_in_at into current_status,arrival from public.volei_attendance
   where event_id=p_event and member_id=p_member for update;
  if not found then raise exception 'Inscrição não encontrada neste jogo.'; end if;
 end if;
 if arrival is not null then raise exception 'A chegada já foi registrada. Use a saída na quadra para preservar a presença.'; end if;
 if current_status='nao_vai' then return; end if;
 if current_status not in ('confirmado','espera','reservado') then raise exception 'Esta inscrição não pode ser desmarcada.'; end if;

 if p_guest is not null then
  update public.volei_guests set status='nao_vai',checked_in_at=null
   where event_id=p_event and member_id=p_member and id=p_guest;
 else
  -- Sponsor and their guest leave the registration together, in one transaction.
  perform 1 from public.volei_guests where event_id=p_event and member_id=p_member for update;
  if exists(select 1 from public.volei_guests where event_id=p_event and member_id=p_member and checked_in_at is not null) then
   raise exception 'O convidado deste membro já tem chegada registrada. Confira a saída pela quadra antes de desmarcar.';
  end if;
  update public.volei_guests set status='nao_vai',checked_in_at=null
   where event_id=p_event and member_id=p_member and status in ('confirmado','espera');
  update public.volei_attendance set status='nao_vai',checked_in_at=null,updated_at=now()
   where event_id=p_event and member_id=p_member;
 end if;
 perform public.volei_admin_fill_slots(p_event);
end $$;
revoke all on function public.volei_admin_cancel_registration(uuid,uuid,uuid) from public,anon;
grant execute on function public.volei_admin_cancel_registration(uuid,uuid,uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
