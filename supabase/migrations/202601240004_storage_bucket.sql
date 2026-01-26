-- Ensure bucket exists (private)
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;
