# Gestor de Tareas Administrativas — V4.7

Aplicación web estática construida con HTML, CSS y JavaScript. Utiliza Supabase Auth y PostgreSQL; GitHub Pages aloja la interfaz. Cada usuario ve únicamente sus propios registros mediante RLS.

## Archivos del proyecto

- `index.html`: Dashboard y estructura de la aplicación.
- `styles.css`: estilos, modo claro/nocturno y personalización tipográfica.
- `app.js`: renderizado, tareas, categorías, heatmap y sincronización con Supabase.
- `login.html` / `login.css`: inicio de sesión y acceso.
- `auth.js`: autenticación Supabase.
- `supabase-config.js`: Project URL y publishable key.
- `theme.js`: preferencia de apariencia guardada en el navegador.
- `.nojekyll`: evita procesamiento de GitHub Pages.
- `03_migration_dynamic_categories.sql`: deja la creación de categorías en manos de cada usuario.
- `04_reset_test_data_one_user.sql`: limpieza opcional de datos de un solo usuario.

## V4.7 — Organización de áreas

### Operacional

Operacional admite categorías dinámicas creadas por cada usuario. Cada categoría contiene nombre y plazo de urgencia propios. El Dashboard genera una tarjeta por categoría, con progreso, tareas, checkbox, fecha, indicador de riesgo, edición y archivado.

### Contabilidad

Contabilidad se presenta como un único panel de tareas y una barra agregada de progreso. No admite subcategorías visibles ni creación de categorías dentro de esta área. El alta rápida presenta una única opción `Contabilidad`.

Para mantener compatible el modelo actual de PostgreSQL (`tasks.category_id` obligatorio), la aplicación crea automáticamente una categoría técnica oculta por usuario llamada `__CONTABILIDAD_GENERAL__`. No se muestra en el Dashboard, en el selector de categorías ni en las etiquetas de tareas; se presenta como `Contabilidad`. Su plazo inicial para calcular urgencias es de 6 días. Las categorías contables antiguas, si existían, se conservan para no romper tareas históricas, pero sus tareas se agrupan visualmente en el panel único.

## Dashboard y visualización

- Las tres tarjetas superiores se mantienen alineadas en escritorio.
- Usuario y fecha se muestran en el lado izquierdo del encabezado.
- El calendario heatmap muestra el nivel de riesgo mensual y una leyenda ampliada.
- Las categorías operacionales se muestran en la columna izquierda (aprox. dos tercios); Contabilidad ocupa la columna derecha (aprox. un tercio).
- La lista de Contabilidad crece con el contenido y no tiene scroll interno.
- El modo claro/nocturno permanece disponible y guarda la preferencia localmente.

## Primera configuración de categorías dinámicas

Si todavía no ejecutaste `03_migration_dynamic_categories.sql`, hazlo una sola vez en Supabase > SQL Editor. El script desactiva el alta automática de categorías predefinidas para cuentas nuevas y elimina defaults vacíos de cuentas existentes, conservando categorías con tareas.

No hace falta ejecutar una migración adicional para V4.7: el contenedor técnico de Contabilidad se crea automáticamente al iniciar sesión.

## Limpiar datos de prueba de un usuario

El archivo `04_reset_test_data_one_user.sql` elimina tareas activas, archivadas y categorías de un único usuario identificado por correo. Conserva la cuenta de Authentication y no afecta a otros usuarios.

1. Abre el SQL Editor de Supabase.
2. En el archivo, sustituye `REEMPLAZAR_POR_CORREO_DEL_USUARIO` por el correo exacto de la cuenta que deseas limpiar.
3. Ejecuta el script.
4. Al volver a iniciar sesión, la aplicación recreará el contenedor técnico oculto de Contabilidad. Operacional quedará sin categorías y podrás crearlas nuevamente.

La limpieza es irreversible. Para limpiar a varios usuarios, cambia el correo y ejecuta el script una vez por cada cuenta. No elimina ni desactiva usuarios de Supabase Auth.

## Publicación en GitHub Pages

Reemplaza en la raíz del repositorio los archivos `index.html`, `styles.css`, `app.js` y `README.md`. Conserva `login.html`, `login.css`, `auth.js`, `supabase-config.js`, `theme.js` y `.nojekyll` de la versión conectada actual. No se requiere publicar archivos SQL para que la aplicación funcione; se incluyen para documentación y mantenimiento.

La base de datos permanece en Supabase. Actualizar GitHub Pages no elimina ni reconstruye los registros.

## Seguridad

- `supabase-config.js` contiene únicamente la URL del proyecto y una publishable key, diseñadas para estar en el frontend.
- Nunca agregues una `sb_secret_`, `service_role` ni la contraseña de PostgreSQL al repositorio.
- La privacidad de los registros depende de las políticas RLS activas en `categories` y `tasks`
