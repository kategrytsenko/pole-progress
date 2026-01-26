select
  schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename='element_categories'
order by policyname;
