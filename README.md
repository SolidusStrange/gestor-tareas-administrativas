# Gestor de Tareas Administrativas — publicación GitHub Pages

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


## V4.1 — Personalización tipográfica

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
