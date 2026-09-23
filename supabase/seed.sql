insert into public.destinations (slug, label, description, url, icon, sort_order, active)
values
  ('instagram', 'Instagram', 'Zdjęcia, relacje i najnowsze informacje.', 'https://www.instagram.com/poza.nuta/', 'instagram', 10, true)
on conflict (slug) do update set
  label = excluded.label,
  description = excluded.description,
  url = excluded.url,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

-- Other social URLs are intentionally not guessed. Add them in /admin/destinations.
