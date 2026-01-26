begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '49548be4-6cbf-4861-ab74-f84b26ec3396', true);

insert into public.element_categories (name, "order")
values ('STUDENT SHOULD FAIL', 999);

rollback;
