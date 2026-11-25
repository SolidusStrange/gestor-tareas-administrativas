-- Gestor de Tareas Administrativas V4.4
-- Subcategorías dinámicas: nuevos usuarios parten sin categorías precargadas.
-- Elimina únicamente categorías legacy vacías; las categorías con tareas (incluidas
-- las archivadas) permanecen intactas.

begin;


create or replace function public.seed_default_categories_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Intencionalmente no se crean categorías iniciales.
  return new;
end;
$$;


-- El trigger existente continúa activo, pero su función ahora no inserta defaults.
-- Elimina categorías predeterminadas vacías, conservando las categorías que
-- tengan cualquier tarea relacionada, activa o archivada.
delete from public.categories c
where c.name in (
  'Compras', 'Ventas', 'Cashier', 'Rendiciones', 'Propinas', 'Efectivo',
  'Factoring', 'P&G', 'Balance trimestral', 'Extras'
)
and not exists (
  select 1 from public.tasks t where t.category_id = c.id
);


commit;


-- Verificación sugerida:
-- SELECT area, name, deadline_days, sort_order
-- FROM public.categories WHERE user_id = auth.uid() ORDER BY area, sort_order;
