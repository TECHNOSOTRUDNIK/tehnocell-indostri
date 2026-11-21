-- VICE CITY contains five quest stages; the original constraint allowed only 0..3.
alter table public.tc_event_progress
  drop constraint if exists tc_event_progress_stage_check;

alter table public.tc_event_progress
  add constraint tc_event_progress_stage_check
  check (stage >= 0 and stage <= 5);
