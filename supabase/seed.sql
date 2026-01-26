-- Minimal seed for MVP

-- Categories
insert into public.element_categories (id, name, "order")
values
  (gen_random_uuid(), 'Шпагати', 10),
  (gen_random_uuid(), 'Крутки', 20),
  (gen_random_uuid(), 'Силові елементи', 30),
  (gen_random_uuid(), 'Комбінації', 40)
on conflict do nothing;

-- Elements: attach to categories by name (stable enough for seed)
insert into public.elements (category_id, name, image_url, "order")
select c.id, e.name, e.image_url, e."order"
from public.element_categories c
join (
  values
    ('Шпагати', 'Front split', null, 10),
    ('Шпагати', 'Middle split', null, 20),
    ('Крутки', 'Basic spin', null, 10),
    ('Крутки', 'Back hook spin', null, 20),
    ('Силові елементи', 'Inverted crucifix', null, 10),
    ('Силові елементи', 'Jasmine', null, 20),
    ('Комбінації', 'Combo #1', null, 10)
) as e(category_name, name, image_url, "order")
  on e.category_name = c.name;
