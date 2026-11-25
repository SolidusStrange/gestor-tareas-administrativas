# Gestor de Tareas Administrativas — V4.3

Aplicación estática HTML/CSS/JavaScript conectada a Supabase Auth y PostgreSQL.

## Archivos que deben quedar en la raíz del repositorio

- `index.html`
- `login.html`
- `styles.css`
- `login.css`
- `app.js`
- `auth.js`
- `supabase-config.js`
- `.nojekyll`

## Publicación rápida

1. Crea un repositorio GitHub. En GitHub Free, GitHub Pages está disponible para repositorios públicos.
2. Sube el CONTENIDO de esta carpeta directamente a la raíz del repositorio (no subas una carpeta contenedora).
3. En `Settings > Pages`, selecciona `Deploy from a branch`, rama `main` y carpeta `/(root)`, luego `Save`.
4. La URL tendrá el formato `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`.

## Supabase Auth URL Configuration

Una vez que GitHub Pages muestre la URL definitiva:

- `Site URL`: `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/login.html`
- `Redirect URLs`: `https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/**`

Si seguirás desarrollando localmente, conserva también:

- `http://127.0.0.1:5500/**`
- `http://localhost:5500/**`

La ruta `login.html` como Site URL permite que los enlaces de invitación abran la pantalla de configuración inicial de contraseña.

## Seguridad

- `supabase-config.js` contiene únicamente el Project URL y la publishable key, que están diseñados para usarse en frontend.
- Nunca subas `sb_secret_...`, `service_role`, ni la contraseña de PostgreSQL.
- La privacidad de las tareas depende de RLS en Supabase; cada cuenta solo debe poder consultar y modificar filas con su propio `user_id`.
- GitHub Pages publica un sitio web accesible desde Internet. Con GitHub Free, Pages requiere que el repositorio sea público. El código frontend y la publishable key serán visibles; los datos siguen protegidos por Supabase RLS si sus políticas están bien configuradas.

## Actualizaciones

Para publicar cambios futuros, reemplaza los archivos de la raíz del repositorio y haz commit/push. GitHub Pages volverá a desplegar la versión nueva. Los registros permanecen en Supabase y no se reemplazan al actualizar la interfaz.


## Personalización tipográfica

Se agregó al final de `styles.css` una sección llamada `V4.1 — PERSONALIZACIÓN TIPOGRÁFICA CENTRALIZADA`.

Para cambiar los tamaños, modifica los valores de las variables CSS del bloque `:root` de esa sección. No es necesario buscar y editar las reglas originales.

| Variable | Elemento | Valor inicial escritorio |
|---|---|---:|
| `--ui-nav-item` | Navegación lateral | 13px |
| `--ui-area-title` | Títulos Operacional / Contabilidad | 16px |
| `--ui-area-subtitle` | Subtítulos de las áreas | 10px |
| `--ui-category-title` | Nombre de categoría | 13px |
| `--ui-category-meta` | Detalle de categoría | 10px |
| `--ui-category-summary` | Resumen de categoría | 10px |
| `--ui-task-name` | Nombre de tarea Operacional | 13px |
| `--ui-task-date` | Fecha de tarea Operacional | 10px |
| `--ui-task-completion` | Texto «Completada: fecha y hora» | 10.5px |
| `--ui-accounting-task-name` | Nombre de tarea Contabilidad | 13px |
| `--ui-accounting-subtitle` | Subcategoría de Contabilidad | 10px |
| `--ui-chart-heading` | Títulos de gráficos | 14px |
| `--ui-chart-value` | Números del gráfico | 10px |
| `--ui-chart-label` | Categorías del gráfico | 9px |
| `--ui-form-label` | Etiquetas de edición | 11px |
| `--ui-form-input` | Campos de edición | 14px |

Los tamaños móviles tienen valores propios en los bloques `@media` inmediatamente posteriores. `login.css` permanece independiente y no se ha modificado.

### Actualizar GitHub Pages

Reemplaza en la raíz del repositorio `styles.css`, `index.html` y `README.md` por los de esta versión y realiza un commit. La base de datos Supabase no se modifica.


## V4.2 — alta centralizada y progreso de Contabilidad

- El alta de tareas se realiza desde un único formulario en el Dashboard.
- El selector agrupa categorías por Operacional y Contabilidad; el identificador de categoría seleccionado determina el destino.
- Se eliminaron los formularios repetidos dentro de cada tarjeta operacional y el formulario independiente de Contabilidad.
- Contabilidad ahora muestra una barra agregada de avance y el detalle de tareas completadas.
- El texto `Completada: DD/MM/YYYY HH:mm` tiene mayor tamaño, peso y contraste en ambas áreas.
- La persistencia y autenticación siguen usando Supabase; no se modificó el esquema de PostgreSQL ni las políticas RLS.

### Actualización de GitHub Pages

Reemplaza `index.html`, `styles.css`, `app.js` y `README.md` en la raíz del repositorio por los archivos de esta versión. Conserva `login.html`, `login.css`, `auth.js`, `supabase-config.js` y `.nojekyll` de la versión conectada actual. No ejecutes nuevamente los scripts SQL: esta actualización no cambia la base de datos.


## V4.3 — modo claro y modo nocturno

- Se agregó un control de apariencia en la esquina superior derecha del Dashboard y del inicio de sesión.
- La preferencia se guarda en `localStorage` con la clave `gestor-admin-theme` y se conserva al cambiar entre páginas o volver a entrar.
- El modo nocturno ajusta fondo, superficies, bordes, textos, gráficos, formularios, archivados y ventanas modales.
- La pantalla de inicio de sesión también respeta el mismo modo visual.
- La preferencia de tema es independiente de los datos de tareas y de Supabase.

### Actualización de GitHub Pages

Reemplaza `index.html`, `login.html`, `styles.css`, `login.css` y agrega el nuevo `theme.js` en la raíz del repositorio. Conserva `app.js`, `auth.js`, `supabase-config.js` y `.nojekyll`. No ejecutes SQL: esta versión no modifica PostgreSQL, RLS ni la autenticación.


## V4.4 — Categorías dinámicas y tipografía ampliada

- Nuevos usuarios parten con cero categorías: se mantienen solo las áreas Operacional y Contabilidad.
- Las subcategorías se crean manualmente con nombre, área y plazo en días.
- Se evita la duplicidad de nombres de categoría (validación en la aplicación y restricción de base de datos).
- El gráfico de barras se genera a partir de las categorías existentes; no contiene nombres predefinidos ni una cantidad fija de columnas.
- Los nombres del gráfico se muestran completos y las columnas se adaptan al número de categorías.
- Aumenta el tamaño de textos de tareas, categorías, fechas y leyendas para pantallas grandes, conservando ajustes responsive.
- Los datos existentes en Supabase se conservan. Las categorías existentes con tareas no se eliminan automáticamente.

### Migración Supabase (ejecutar una vez)

Ejecuta `03_migration_dynamic_categories.sql` en SQL Editor. Esta migración detiene la creación automática de categorías predeterminadas para cuentas nuevas y elimina solo categorías antiguas que no tengan tareas asociadas. Categorías con tareas activas o archivadas se conservan.

No borra tareas, no cambia usuarios ni políticas RLS.


## V4.4 — Subcategorías dinámicas y tipografía ampliada

- Nuevos usuarios comienzan con cero subcategorías; solo existen las áreas Operacional y Contabilidad.
- Las categorías se crean desde la UI con nombre, área y plazo de urgencia.
- La aplicación valida que no se repita el nombre de una categoría en la misma cuenta. La restricción unique de PostgreSQL también previene duplicados.
- El gráfico de barras depende de las categorías existentes: no usa un listado fijo de etiquetas ni diez columnas predefinidas.
- Se muestran nombres completos en el gráfico; el layout adapta sus columnas al número de categorías.
- Se aumentan nombres de tareas, categorías, fechas y textos vacíos para mejorar la lectura en monitores grandes.
- Los datos existentes se conservan; las categorías con tareas no se borran automáticamente.

### Migración de Supabase

Ejecuta una vez el archivo `03_migration_dynamic_categories.sql` en Supabase SQL Editor. Desactiva la creación automática de categorías iniciales para nuevos usuarios y elimina únicamente categorías legacy que no tengan tareas asociadas. Las categorías con tareas activas o archivadas se conservan. No elimina usuarios, tareas ni políticas RLS.

### Publicar V4.4

Reemplaza `index.html`, `styles.css`, `app.js` y `README.md` en el repositorio GitHub. Conserva `login.html`, `login.css`, `auth.js`, `supabase-config.js`, `theme.js` y `.nojekyll`. Ejecuta la migración SQL antes de probar con cuentas nuevas.


## V4.5 — Dos áreas fijas y subcategorías creadas por el usuario

- Las únicas áreas fijas son Operacional y Contabilidad.
- No se precargan categorías. Cada usuario crea las subcategorías que necesita, indicando nombre, área y plazo.
- Se mantiene la validación de nombres repetidos dentro de la cuenta; la base incorpora además un índice único insensible a mayúsculas y espacios externos.
- Contabilidad conserva su columna derecha de un tercio en escritorio.
- El resumen superior aumenta tamaño de títulos, contadores, etiquetas y porcentajes.
- El gráfico de categorías mantiene una fila de columnas con desplazamiento horizontal cuando hay muchas categorías; los nombres largos se truncan visualmente con puntos suspensivos y el nombre completo permanece disponible al pasar el cursor.
- El nombre de las tareas contables deja de usar negrita más pesada que las tareas operacionales.
- La aplicación ya no importa la antigua caché local de prueba al iniciar una cuenta vacía: Supabase queda como fuente de verdad para iniciar limpio.

### Limpieza de datos de prueba en Supabase

Ejecuta `04_reset_test_data_all_users.sql` desde Supabase SQL Editor. El script elimina todas las filas de `public.tasks` y `public.categories` de todos los usuarios, conserva las cuentas de `auth.users`, reafirma que el trigger de alta no cree categorías predeterminadas y agrega una restricción de unicidad por usuario sobre el nombre normalizado.

**La limpieza es irreversible.** Descarga un respaldo antes si existe cualquier dato que quieras conservar. No elimina usuarios ni contraseñas.

### Publicar V4.5

Reemplaza en la raíz del repositorio `index.html`, `styles.css`, `app.js` y `README.md`. Conserva `login.html`, `login.css`, `auth.js`, `supabase-config.js`, `theme.js` y `.nojekyll` de la versión conectada. Ejecuta el SQL de limpieza una sola vez en Supabase; no hace falta modificar las políticas RLS.


## V4.6 — Calendario mensual tipo heatmap

- Se reemplaza el gráfico de barras por un calendario mensual basado en las fechas de referencia de las tareas activas.
- Cada día adopta el nivel de riesgo más alto entre sus tareas: verde (en plazo o completada), amarillo (primer tramo de seguimiento), naranja (desde la mitad del plazo) y rojo (plazo alcanzado o superado).
- Los días sin tareas se muestran en gris neutro. Las tareas archivadas se excluyen del calendario.
- Si hay varias tareas en un día, se muestra el contador y el color representa el riesgo más alto. El detalle de nombres, categorías y estados se consulta al pasar el cursor.
- El calendario abre en el mes actual y permite navegar a meses anteriores; no permite navegar a meses futuros.
- El calendario no requiere cambios de PostgreSQL, Supabase Auth ni políticas RLS.

### Interpretación de colores

- Verde: fecha de referencia de hoy o futura, o tarea completada.
- Amarillo: ya transcurrió tiempo, pero aún no se alcanza la mitad del plazo de la categoría.
- Naranja: se alcanzó al menos la mitad del plazo, pero todavía no se alcanza el límite.
- Rojo: los días transcurridos son iguales o superiores al plazo de la categoría.
- Gris: no hay tareas activas con esa fecha.

### Actualizar GitHub Pages

Reemplaza `index.html`, `styles.css`, `app.js` y `README.md`. Conserva los archivos de autenticación, configuración de Supabase y `theme.js`. No ejecutes SQL: esta versión no cambia la base de datos.


## V4.6 — Calendario mensual tipo heatmap

- Se reemplaza el gráfico de barras por un calendario mensual basado en las fechas de referencia de las tareas activas.
- Cada día adopta el nivel de riesgo más alto entre sus tareas: verde (en plazo o completada), amarillo (primer tramo de seguimiento), naranja (desde la mitad del plazo) y rojo (plazo alcanzado o superado).
- Los días sin tareas se muestran en gris neutro. Las tareas archivadas se excluyen del calendario.
- Si hay varias tareas en un día, se muestra el contador y el color representa el riesgo más alto. El detalle de nombres, categorías y estados se consulta al pasar el cursor.
- El calendario abre en el mes actual y permite navegar a meses anteriores; no permite navegar a meses futuros.
- El calendario no requiere cambios de PostgreSQL, Supabase Auth ni políticas RLS.

### Interpretación de colores

- Verde: fecha de referencia de hoy o futura, o tarea completada.
- Amarillo: ya transcurrió tiempo, pero aún no se alcanza la mitad del plazo de la categoría.
- Naranja: se alcanzó al menos la mitad del plazo, pero todavía no se alcanza el límite.
- Rojo: los días transcurridos son iguales o superiores al plazo de la categoría.
- Gris: no hay tareas activas con esa fecha.

### Actualizar GitHub Pages

Reemplaza `index.html`, `styles.css`, `app.js` y `README.md`. Conserva los archivos de autenticación, configuración de Supabase y `theme.js`. No ejecutes SQL: esta versión no cambia la base de datos.
