alter table public.calendar_items add column if not exists format text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'calendar_items_format_check') then
    alter table public.calendar_items add constraint calendar_items_format_check check (format in ('post','story'));
  end if;
end $$;
