-- ============================================================================
-- Gestor de Tareas Administrativas V4.5
-- LIMPIEZA TOTAL DE DATOS DE PRUEBA PARA TODOS LOS USUARIOS.
--
-- Elimina tareas y categorías de todas las cuentas de la aplicación.
-- NO elimina usuarios de Authentication, contraseñas, políticas RLS ni tablas.
--
-- IMPORTANTE: operación irreversible. Ejecutar solo si todos los datos actuales
-- son de prueba y se desea que cada cuenta comience con cero categorías y tareas.
-- ============================================================================

begin;

-- 1) Elimina primero las tareas por la relación FK con categories.
delete from public.tasks;

-- 2) Elimina todas las categorías existentes de todos los usuarios.
delete from public.categories;

-- 3) Impide que las cuentas nuevas reciban categorías por defecto.
create or replace function public.seed_default_categories_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Cada usuario crea manualmente sus categorías.
  return new;
end;
$$;

-- 4) Asegura que el trigger existente ejecute la función vacía.
drop trigger if exists on_auth_user_created_seed_categories on auth.users;
create trigger on_auth_user_created_seed_categories
  after insert on auth.users
  for each row execute function public.seed_default_categories_for_new_user();

-- 5) Evita duplicados aunque cambien mayúsculas/minúsculas o espacios externos.
create unique index if not exists categories_user_name_normalized_uq
  on public.categories (user_id, lower(btrim(name)));

commit;

-- Verificación posterior: ambas cantidades deben ser cero.
select
  (select count(*) from public.categories) as categories_remaining,
  (select count(*) from public.tasks) as tasks_remaining;

-- Las cuentas siguen existiendo:
select count(*) as auth_users_preserved from auth.users;
