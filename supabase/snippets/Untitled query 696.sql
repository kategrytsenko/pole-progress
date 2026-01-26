begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '3996a6cd-c93f-4ef7-a897-c5041dc6fc57', true);

insert into public.element_categories (name, "order")
values ('ADMIN OK', 998);

rollback;