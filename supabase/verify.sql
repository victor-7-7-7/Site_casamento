-- Execute no SQL Editor após setup.sql. Todos os dados de teste sofrem rollback.
begin;
do $$
begin
  assert (select relrowsecurity from pg_class where oid = 'public.wedding_rsvps'::regclass), 'RLS desativada';
  assert not has_table_privilege('anon', 'public.wedding_rsvps', 'SELECT'), 'Leitura anon indevida';
  assert not has_table_privilege('authenticated', 'public.wedding_rsvps', 'SELECT'), 'Leitura authenticated indevida';
  assert not has_table_privilege('anon', 'public.wedding_rsvps', 'UPDATE'), 'UPDATE anon indevido';
  assert not has_table_privilege('authenticated', 'public.wedding_rsvps', 'UPDATE'), 'UPDATE authenticated indevido';
  assert not has_table_privilege('anon', 'public.wedding_rsvps', 'DELETE'), 'DELETE anon indevido';
  assert not has_table_privilege('authenticated', 'public.wedding_rsvps', 'DELETE'), 'DELETE authenticated indevido';
end $$;
set local role anon;
insert into public.wedding_rsvps(full_name, phone, attending, companion_count, companions, notes, consent)
values ('Teste Verificacao', '+5511999990000', true, 1, array['Pessoa Convidada'], '', true);
do $$
begin
  begin
    insert into public.wedding_rsvps(full_name, phone, attending, consent)
    values ('  TESTE   VERIFICACAO  ', '+5511999990000', true, true);
    raise exception 'Duplicata aceita indevidamente';
  exception when unique_violation then null;
  end;
  begin
    insert into public.wedding_rsvps(full_name, phone, attending, companion_count, companions, consent)
    values ('Teste Invalido', '+5511999990001', false, 1, array['Pessoa Convidada'], true);
    raise exception 'Acompanhante aceito em ausência';
  exception when check_violation then null;
  end;
  begin
    perform full_name from public.wedding_rsvps;
    raise exception 'Leitura pública permitida indevidamente';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role authenticated;
insert into public.wedding_rsvps(full_name, phone, attending, consent)
values ('Teste Autenticado', '+5511999990002', false, true);
do $$
begin
  begin
    perform full_name from public.wedding_rsvps;
    raise exception 'Leitura authenticated permitida indevidamente';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
