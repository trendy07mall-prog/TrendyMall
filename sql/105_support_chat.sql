-- Website support chat (app/api/chat/route.ts, lib/support-chat/).
--
-- 1) support_chat_messages: every customer message and assistant reply,
--    kept so the store owner can read real conversations and spot
--    questions the assistant answers badly. Written only by the
--    service-role client from the chat route. RLS is enabled with zero
--    policies, so nothing reaches it over PostgREST with the anon key --
--    same deny-all posture as guest_lookup_attempts (sql/033).
create table public.support_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  -- Which model answered (primary / fallback / guard), null for the
  -- customer's own messages. Lets the owner see how often the backup ran.
  provider text,
  created_at timestamptz not null default now()
);

alter table public.support_chat_messages enable row level security;

create index support_chat_messages_conversation_idx
  on public.support_chat_messages(conversation_id, created_at);
create index support_chat_messages_created_idx
  on public.support_chat_messages(created_at desc);

-- 2) Per-IP rate limit for the chat route. Vercel functions don't share
--    memory between requests, so lib/rate-limit.ts's in-memory Map can't
--    hold a limit here; this is the same table + security-definer
--    function shape as check_guest_lookup_rate_limit (sql/033). Protects
--    the free AI quota from one visitor (or bot) spending all of it.
create table public.support_chat_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  attempted_at timestamptz not null default now()
);

alter table public.support_chat_attempts enable row level security;

create index support_chat_attempts_ip_idx on public.support_chat_attempts(ip, attempted_at);

create or replace function public.check_support_chat_rate_limit(
  p_ip text,
  p_max_attempts int default 20,
  p_window_minutes int default 10
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  delete from public.support_chat_attempts where attempted_at < now() - interval '1 day';

  select count(*) into v_count from public.support_chat_attempts
    where ip = p_ip and attempted_at > now() - (p_window_minutes || ' minutes')::interval;

  if v_count >= p_max_attempts then
    return false;
  end if;

  insert into public.support_chat_attempts (ip) values (p_ip);
  return true;
end;
$$;

revoke all on function public.check_support_chat_rate_limit(text, int, int) from public;
grant execute on function public.check_support_chat_rate_limit(text, int, int) to anon, authenticated;
