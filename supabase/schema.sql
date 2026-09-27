-- 关系罗盘：Supabase 数据表与访问控制
-- 在 Supabase Dashboard > SQL Editor 中完整运行一次。

create extension if not exists pgcrypto;

create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,80}$'),
  title text not null check (char_length(title) between 2 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 40),
  contact_kind text not null check (contact_kind in ('QQ', '微信', '邮箱', '其他')),
  contact_value text not null check (char_length(contact_value) between 3 and 120),
  type_code text not null check (char_length(type_code) = 4),
  type_name text not null check (char_length(type_name) between 3 and 100),
  scores jsonb not null check (jsonb_typeof(scores) = 'object'),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  consent_to_collection boolean not null check (consent_to_collection = true),
  consent_version text not null,
  completed_at timestamptz not null,
  report_status text not null default '待发送' check (report_status in ('待发送', '制作中', '已发送')),
  created_at timestamptz not null default now()
);

create index if not exists responses_survey_created_idx
  on public.responses (survey_id, created_at desc);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.validate_response_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer_count integer;
begin
  if not exists (
    select 1 from public.surveys s
    where s.id = new.survey_id and s.active = true
  ) then
    raise exception 'survey is not active';
  end if;

  select count(*) into answer_count
  from jsonb_object_keys(new.answers);
  if answer_count <> 104 then
    raise exception 'response must contain exactly 104 answers';
  end if;

  new.report_status := '待发送';
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists validate_response_before_insert on public.responses;
create trigger validate_response_before_insert
before insert on public.responses
for each row execute function private.validate_response_insert();

alter table public.surveys enable row level security;
alter table public.responses enable row level security;

revoke all on table public.surveys from anon, authenticated;
revoke all on table public.responses from anon, authenticated;

grant select, insert, update, delete on table public.surveys to authenticated;
grant select, update, delete on table public.responses to authenticated;
grant insert on table public.responses to anon;

drop policy if exists "owners manage their surveys" on public.surveys;
create policy "owners manage their surveys"
on public.surveys
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "anonymous participants submit completed responses" on public.responses;
create policy "anonymous participants submit completed responses"
on public.responses
for insert
to anon
with check (
  consent_to_collection = true
  and survey_id is not null
  and char_length(contact_value) between 3 and 120
  and jsonb_typeof(scores) = 'object'
  and jsonb_typeof(answers) = 'object'
);

drop policy if exists "owners read their responses" on public.responses;
create policy "owners read their responses"
on public.responses
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    where s.id = responses.survey_id
      and s.owner_id = (select auth.uid())
  )
);

drop policy if exists "owners update their responses" on public.responses;
create policy "owners update their responses"
on public.responses
for update
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    where s.id = responses.survey_id
      and s.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.surveys s
    where s.id = responses.survey_id
      and s.owner_id = (select auth.uid())
  )
);

drop policy if exists "owners delete their responses" on public.responses;
create policy "owners delete their responses"
on public.responses
for delete
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    where s.id = responses.survey_id
      and s.owner_id = (select auth.uid())
  )
);
