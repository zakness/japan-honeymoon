-- Add parent/child relationship to places (one-level grouping)
-- A parent place (mall, neighborhood, street) groups child places.
-- Children "ride along" with the parent — only parents are scheduled into itinerary_items.

alter table public.places
  add column parent_place_id uuid references public.places(id) on delete set null,
  add column child_sort_order integer;

-- No self-reference
alter table public.places
  add constraint places_parent_not_self check (
    parent_place_id is null or parent_place_id <> id
  );

-- Index for child lookups by parent
create index if not exists places_parent_place_id_idx
  on public.places (parent_place_id)
  where parent_place_id is not null;

-- One-level rule: a child cannot also be a parent. Enforced via trigger
-- because Postgres CHECK constraints cannot reference other rows.
create or replace function public.places_one_level_nesting()
returns trigger
language plpgsql
as $$
begin
  -- If this row is being set as a child, ensure no other row has it as a parent.
  if new.parent_place_id is not null then
    if exists (
      select 1 from public.places
      where parent_place_id = new.id
        and id <> new.id
    ) then
      raise exception 'cannot nest a place that already has children (id=%)', new.id
        using errcode = 'check_violation';
    end if;

    -- Ensure the proposed parent is not itself a child.
    if exists (
      select 1 from public.places
      where id = new.parent_place_id
        and parent_place_id is not null
    ) then
      raise exception 'cannot nest under a place that is already a child (parent_id=%)', new.parent_place_id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists places_one_level_nesting_trg on public.places;
create trigger places_one_level_nesting_trg
  before insert or update of parent_place_id on public.places
  for each row
  execute function public.places_one_level_nesting();
