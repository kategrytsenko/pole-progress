begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'd83d9f97-8c35-41cc-8da6-eea44c828d2d', true);

insert into public.element_categories (name, "order")
values ('ADMIN OK', 998);

rollback;
