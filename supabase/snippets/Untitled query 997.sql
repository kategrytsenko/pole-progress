begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'f95d20ef-9cff-4439-a940-c7b951255c94', true);

insert into public.element_categories (name, "order")
values ('STUDENT SHOULD FAIL', 999);

rollback;
