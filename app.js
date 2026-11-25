// ============================================================================
// 1. CONFIGURACIÓN Y CATÁLOGO INICIAL
//    Los identificadores y límites se mantienen independientes del HTML para
//    facilitar una futura conexión con Supabase sin cambiar la interfaz.
// ============================================================================
const STORAGE_KEY = "work-task-board-v2";
const LEGACY_STORAGE_KEY = "work-task-board-v1";

// V4.4: no se precargan subcategorías. Cada usuario crea las suyas.
const DEFAULT_CATEGORIES = [];

const CHART_COLORS = ["#5b9b8d", "#70aaa1", "#8bb9b4", "#a48ac0", "#b49bc9", "#d29a68", "#d8b26b", "#719db7", "#8aabb9", "#9c9b7b", "#c5869b", "#7e9d83"];
const categoryGrid = document.getElementById("group-sections");
const dashboardView = document.getElementById("dashboard-view");
const tasksView = document.getElementById("tasks-view");
const archiveView = document.getElementById("archive-view");
const categoryTemplate = document.getElementById("category-template");
const accountingTaskTemplate = document.getElementById("accounting-task-template");
const accountingList = document.getElementById("contabilidad-list");
const taskTemplate = document.getElementById("task-template");
const managerRowTemplate = document.getElementById("task-manager-row-template");
const archiveCategoryTemplate = document.getElementById("archive-category-template");
const archivedTaskTemplate = document.getElementById("archived-task-template");
const taskDialog = document.getElementById("task-dialog");
const taskCreateDialog = document.getElementById("task-create-dialog");
const categoryDialog = document.getElementById("category-dialog");
const addCategoryButton = document.getElementById("add-category-open");
const taskManagerList = document.getElementById("task-manager-list");

// ============================================================================
// 2. UTILIDADES DE IDENTIFICACIÓN Y FECHAS
//    Las fechas se guardan siempre como YYYY-MM-DD y se muestran como DD/MM/YYYY.
// ============================================================================
function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // UUID v4 de respaldo para navegadores sin crypto.randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

// Valida la fecha escrita por el usuario en formato DD/MM/YYYY.
function parseDisplayDate(value) {
  if (typeof value !== "string" || !/^\d{2}\/\d{2}\/\d{4}$/.test(value.trim())) return null;
  const [day, month, year] = value.trim().split("/").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return dateKey(parsed);
}

// Convierte una fecha interna ISO a la presentación local requerida.
function formatDate(value) {
  const date = parseDateKey(value);
  if (!date) return "Fecha no definida";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

// Genera marcas de tiempo DD/MM/YYYY HH:mm para checks y archivado.
function formatTimestamp(date = new Date()) {
  const pad = value => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Mantiene compatibilidad con los timestamps ISO de versiones anteriores.
function formatSavedTimestamp(value) {
  if (typeof value !== "string" || !value) return "";
  if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : formatTimestamp(parsed);
}

function todayLongLabel() {
  return formatTimestamp();
}

// ============================================================================
// 3. ESTADO INICIAL, NORMALIZACIÓN Y PERSISTENCIA LOCAL
//    Se conserva la misma clave de localStorage usada por las versiones 2.x.
// ============================================================================
function createInitialState() {
  return {
    categories: DEFAULT_CATEGORIES.map(category => ({ ...category })),
    tasks: Object.fromEntries(DEFAULT_CATEGORIES.map(category => [category.id, []])),
    archived: [],
    collapsedGroups: { operacional: false, contabilidad: false }
  };
}

function normalizeTask(task) {
  if (!task || typeof task.id !== "string" || typeof task.text !== "string") return null;
  let dueDate = parseDateKey(task.dueDate) ? task.dueDate : null;
  if (!dueDate && typeof task.createdAt === "string") {
    const legacyDate = new Date(task.createdAt);
    if (!Number.isNaN(legacyDate.getTime())) dueDate = dateKey(legacyDate);
  }
  return {
    id: task.id,
    text: task.text.slice(0, 120),
    completed: Boolean(task.completed),
    completedAt: typeof task.completedAt === "string" ? task.completedAt : null,
    dueDate: dueDate || dateKey(),
    createdAt: typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString()
  };
}

function loadState() {
  const fresh = createInitialState();
  try {
    const currentRaw = localStorage.getItem(STORAGE_KEY);
    const legacyRaw = currentRaw ? null : localStorage.getItem(LEGACY_STORAGE_KEY);
    const raw = currentRaw || legacyRaw;
    if (!raw) return fresh;
    const parsed = JSON.parse(raw);

    // Carga la estructura actual (categorías, tareas por categoría y archivados).
    if (Array.isArray(parsed.categories) && parsed.tasks && typeof parsed.tasks === "object") {
      const loadedCategories = parsed.categories
        .filter(category => category && typeof category.id === "string" && typeof category.name === "string")
        .map(category => {
          const fallback = DEFAULT_CATEGORIES.find(item => item.id === category.id);
          return {
            id: category.id,
            name: category.name.slice(0, 40),
            groupId: category.groupId === "contabilidad" ? "contabilidad" : "operacional",
            daysLimit: Math.max(1, Math.min(3650, Number(category.daysLimit) || fallback?.daysLimit || 6)),
            color: typeof category.color === "string" ? category.color : fallback?.color || "#648f85",
            bg: typeof category.bg === "string" ? category.bg : fallback?.bg || "#edf4f1"
          };
        });

      // Agrega cualquier categoría predeterminada que falte, sin duplicar datos.
      for (const defaultCategory of DEFAULT_CATEGORIES) {
        if (!loadedCategories.some(category => category.id === defaultCategory.id)) loadedCategories.push({ ...defaultCategory });
      }
      fresh.categories = loadedCategories;
      fresh.tasks = Object.fromEntries(loadedCategories.map(category => [
        category.id,
        Array.isArray(parsed.tasks[category.id]) ? parsed.tasks[category.id].map(normalizeTask).filter(Boolean) : []
      ]));

      // Conserva en cada archivado el nombre histórico de su categoría.
      fresh.archived = Array.isArray(parsed.archived) ? parsed.archived.map(item => {
        const normalized = normalizeTask(item);
        if (!normalized || typeof item.categoryId !== "string") return null;
        const matchingCategory = loadedCategories.find(category => category.id === item.categoryId);
        return {
          ...normalized,
          categoryId: item.categoryId,
          categoryName: typeof item.categoryName === "string" ? item.categoryName : matchingCategory?.name || "Categoría anterior",
          groupId: item.groupId === "contabilidad" ? "contabilidad" : matchingCategory?.groupId || "operacional",
          archivedAt: formatSavedTimestamp(item.archivedAt) || formatTimestamp()
        };
      }).filter(Boolean) : [];
      fresh.collapsedGroups = {
        operacional: Boolean(parsed.collapsedGroups?.operacional),
        contabilidad: Boolean(parsed.collapsedGroups?.contabilidad)
      };
      return fresh;
    }

    // Compatibilidad con la primera versión, cuya estructura era distinta.
    if (parsed.categories && typeof parsed.categories === "object") {
      for (const category of DEFAULT_CATEGORIES) {
        const oldTasks = parsed.categories[category.id];
        if (Array.isArray(oldTasks)) fresh.tasks[category.id] = oldTasks.map(normalizeTask).filter(Boolean);
      }
      if (Array.isArray(parsed.archived)) {
        fresh.archived = parsed.archived.map(item => {
          const normalized = normalizeTask(item);
          if (!normalized || typeof item.categoryId !== "string") return null;
          const category = DEFAULT_CATEGORIES.find(entry => entry.id === item.categoryId);
          if (!category) return null;
          return { ...normalized, categoryId: category.id, categoryName: category.name, groupId: category.groupId, archivedAt: formatTimestamp() };
        }).filter(Boolean);
      }
    }
    return fresh;
  } catch (error) {
    console.warn("No fue posible leer los datos guardados. Se iniciará un panel vacío.", error);
    return fresh;
  }
}

// Estado de sesión y sincronización. Supabase es la fuente de verdad; la caché
// local se separa por usuario y la clave antigua queda intacta como respaldo.
let currentUser = null;
let cloudReady = false;
let cloudSaveTimer = null;
let cloudSaveQueue = Promise.resolve();
let cloudSyncErrorShown = false;
let cloudRefreshInFlight = false;
let lastSyncedSnapshot = null;

function cloneAppState(value) {
  return JSON.parse(JSON.stringify(value));
}

function setCloudStatus(message, kind = "ok") {
  const text = document.getElementById("cloud-status-text");
  const container = document.getElementById("cloud-status");
  if (text) text.textContent = message;
  if (container) {
    container.classList.toggle("status-error", kind === "error");
    container.classList.toggle("status-saving", kind === "saving");
  }
}

function userCacheKey(userId) {
  return `${STORAGE_KEY}:cache:${userId}`;
}

function userPreferencesKey(userId) {
  return `${STORAGE_KEY}:preferences:${userId}`;
}

function saveState() {
  try {
    if (currentUser) {
      localStorage.setItem(userCacheKey(currentUser.id), JSON.stringify(state));
      localStorage.setItem(userPreferencesKey(currentUser.id), JSON.stringify({
        collapsedGroups: state.collapsedGroups || { operacional: false, contabilidad: false }
      }));
    }
  } catch (error) {
    console.warn("No se pudo actualizar la caché local por usuario.", error);
  }

  if (!cloudReady || !currentUser) return;
  setCloudStatus("Guardando cambios…", "saving");
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    // Limpia el identificador al ejecutar el temporizador para permitir refresh y estado sincronizado.
    cloudSaveTimer = null;
    const snapshot = JSON.parse(JSON.stringify(state));
    cloudSaveQueue = cloudSaveQueue
      .catch(() => {})
      .then(() => persistCloudSnapshot(snapshot))
      .then(() => {
        cloudSyncErrorShown = false;
        if (!cloudSaveTimer) setCloudStatus("Sincronizado con Supabase", "ok");
      })
      .catch(error => {
        console.error("Error al sincronizar con Supabase:", error);
        setCloudStatus("Error de sincronización", "error");
        if (!cloudSyncErrorShown) {
          cloudSyncErrorShown = true;
          window.alert(`No se pudo sincronizar el último cambio con Supabase.\n\n${error.message || error}\n\nTus cambios permanecen en la caché local de esta cuenta. Revisa la conexión y vuelve a intentarlo.`);
        }
      });
  }, 250);
}

// Se conserva una instantánea del almacenamiento anterior para ofrecer una
// migración única al primer inicio de sesión. El estado visible se carga desde la nube.
const legacyStateForMigration = loadState();
let state = createInitialState();
let currentView = "dashboard";
let editingTask = null;
let dragPayload = null;
let lastRenderedDate = dateKey();

// ============================================================================
// 4. CÁLCULOS DE PROGRESO, PLAZOS Y URGENCIA
// ============================================================================
function progressPercent(tasks) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(task => task.completed).length / tasks.length) * 100);
}

// Cambia gradualmente de rojo a amarillo y verde según el porcentaje completado.
function progressColor(percent) {
  const hue = Math.max(0, Math.min(100, percent)) * 1.2;
  return `hsl(${hue}, 70%, 43%)`;
}

function dayDifferenceFromToday(dateValue) {
  const target = parseDateKey(dateValue);
  if (!target) return 0;
  const now = new Date();
  // UTC evita errores de un día al cruzar cambios de horario de verano.
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((todayUtc - targetUtc) / 86400000);
}

// No presenta alerta el mismo día; amarillo antes del límite y rojo al alcanzarlo.
function getUrgency(task, category) {
  if (task.completed) return null;
  const elapsedDays = dayDifferenceFromToday(task.dueDate);
  if (elapsedDays <= 0) return null;
  if (elapsedDays >= category.daysLimit) return { level: "red", label: "Crítica", elapsedDays };
  return { level: "yellow", label: "En observación", elapsedDays };
}

function groupTasks(groupId) {
  return state.categories
    .filter(category => category.groupId === groupId)
    .flatMap(category => state.tasks[category.id] || []);
}

function allActiveTasks() {
  return state.categories.flatMap(category => (state.tasks[category.id] || []).map(task => ({ task, category })));
}

function updateProgressElement(fillElement, percent) {
  fillElement.style.width = `${percent}%`;
  fillElement.style.backgroundColor = progressColor(percent);
}

// ============================================================================
// 5. RENDERIZADO DEL DASHBOARD
//    Operacional se organiza en tarjetas; Contabilidad aparece como una lista
//    vertical y el alta de tareas se centraliza en un único formulario global.
// ============================================================================
function updateOverview() {
  const activeTasks = allActiveTasks().map(item => item.task);
  const completed = activeTasks.filter(task => task.completed).length;
  const overall = progressPercent(activeTasks);
  document.getElementById("overall-percent").textContent = `${overall}%`;
  document.getElementById("overall-detail").textContent = `${completed} de ${activeTasks.length} tareas completadas`;
  updateProgressElement(document.getElementById("overall-progress-fill"), overall);
  document.getElementById("overall-progress").setAttribute("aria-valuenow", String(overall));

  const summaries = [
    { id: "operacional", key: "operational", tasks: groupTasks("operacional") },
    { id: "contabilidad", key: "accounting", tasks: groupTasks("contabilidad") }
  ];
  for (const summary of summaries) {
    const percent = progressPercent(summary.tasks);
    const done = summary.tasks.filter(task => task.completed).length;
    document.getElementById(`${summary.key}-percent`).textContent = `${percent}%`;
    document.getElementById(`${summary.key}-detail`).textContent = `${done} de ${summary.tasks.length} completadas`;
    updateProgressElement(document.getElementById(`${summary.key}-progress-fill`), percent);
    document.getElementById(`${summary.key}-completion`).textContent = `${percent}%`;
    if (summary.id === "contabilidad") {
      const accountingTrack = document.getElementById("accounting-panel-progress");
      const accountingFill = document.getElementById("accounting-panel-progress-fill");
      accountingTrack.setAttribute("aria-valuenow", String(percent));
      accountingTrack.setAttribute("aria-label", `Progreso de Contabilidad: ${percent}%`);
      accountingFill.style.width = `${percent}%`;
      accountingFill.style.backgroundColor = progressColor(percent);
      document.getElementById("accounting-panel-progress-detail").textContent = `${done} de ${summary.tasks.length} completadas`;
    }
    const categoriesInGroup = state.categories.filter(category => category.groupId === summary.id);
    document.getElementById(`${summary.key}-summary`).textContent = `${categoriesInGroup.length} categorías · ${summary.tasks.length} tareas`;
  }
  document.getElementById("nav-archived-count").textContent = state.archived.length;
}

// Cuenta tareas pendientes por nivel de urgencia para ordenar las categorías.
function getCategoryTaskStats(category) {
  const tasks = state.tasks[category.id] || [];
  let yellow = 0;
  let red = 0;
  for (const task of tasks) {
    const urgency = getUrgency(task, category);
    if (urgency?.level === "yellow") yellow += 1;
    if (urgency?.level === "red") red += 1;
  }
  return { tasks, pending: tasks.filter(task => !task.completed), completed: tasks.filter(task => task.completed), yellow, red };
}

// Las categorías operacionales se priorizan por críticas, amarillas y pendientes.
function sortCategoriesByUrgency(categories) {
  return categories
    .map((category, originalIndex) => ({ category, originalIndex, stats: getCategoryTaskStats(category) }))
    .sort((a, b) =>
      b.stats.red - a.stats.red ||
      b.stats.yellow - a.stats.yellow ||
      b.stats.pending.length - a.stats.pending.length ||
      a.originalIndex - b.originalIndex
    )
    .map(item => item.category);
}

// Ordena tareas: críticas primero, luego advertencias, pendientes normales y hechas.
function sortTaskEntries(entries) {
  return entries.map((entry, index) => {
    const urgency = getUrgency(entry.task, entry.category);
    const rank = urgency?.level === "red" ? 2 : urgency?.level === "yellow" ? 1 : 0;
    return { ...entry, urgency, rank, index };
  }).sort((a, b) =>
    Number(a.task.completed) - Number(b.task.completed) ||
    b.rank - a.rank ||
    a.task.dueDate.localeCompare(b.task.dueDate) ||
    a.index - b.index
  );
}

// Actualiza la barra de una categoría operacional usando una animación de llenado.
function setAnimatedCategoryProgress(track, fill, percent, name) {
  track.setAttribute("aria-valuenow", String(percent));
  track.setAttribute("aria-label", `Progreso de ${name}: ${percent}%`);
  fill.style.setProperty("--progress-target", `${percent}%`);
  fill.style.backgroundColor = progressColor(percent);
  fill.classList.remove("progress-animate");
  // Forzar reflow permite repetir la animación cuando una tarea cambia de estado.
  void fill.offsetWidth;
  fill.classList.add("progress-animate");
}

// Renderiza una tarjeta operacional; las tareas se agregan desde el formulario global.
function renderCategory(category) {
  const stats = getCategoryTaskStats(category);
  const { tasks, pending, completed, yellow, red } = stats;
  const fragment = categoryTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".category-card");
  const percent = progressPercent(tasks);

  card.dataset.categoryId = category.id;
  card.dataset.groupId = category.groupId;
  card.style.setProperty("--category-ink", category.color);
  card.style.setProperty("--category-bg", category.bg);
  card.querySelector(".category-icon").textContent = category.name.slice(0, 3).toUpperCase();
  card.querySelector(".category-title").textContent = category.name;
  card.querySelector(".category-meta").textContent = `${category.daysLimit} ${category.daysLimit === 1 ? "día" : "días"} de plazo · ${tasks.length} ${tasks.length === 1 ? "tarea" : "tareas"}`;
  card.querySelector(".category-percent").textContent = `${percent}%`;

  const progressTrack = card.querySelector(".category-progress-track");
  setAnimatedCategoryProgress(progressTrack, card.querySelector(".category-progress-fill"), percent, category.name);
  card.querySelector(".category-pending-count").textContent = `${pending.length} pendientes`;
  card.querySelector(".category-completed-count").textContent = `${completed.length} hechas`;

  const priorityIndicators = card.querySelector(".category-priority-indicators");
  priorityIndicators.replaceChildren();
  if (red > 0) priorityIndicators.appendChild(makeCategoryPriorityIndicator("red", red));
  if (yellow > 0) priorityIndicators.appendChild(makeCategoryPriorityIndicator("yellow", yellow));

  const taskList = card.querySelector(".category-task-preview");
  const sorted = sortTaskEntries(tasks.map(task => ({ task, category })));
  for (const item of sorted) taskList.appendChild(renderDashboardTask(item.task, category, item.urgency));
  if (!tasks.length) {
    const empty = document.createElement("li");
    empty.className = "category-empty-note";
    empty.textContent = "Sin tareas registradas";
    taskList.appendChild(empty);
  }

  return fragment;
}

// Construye un indicador pequeño de advertencias/críticas en la cabecera de categoría.
function makeCategoryPriorityIndicator(level, count) {
  const indicator = document.createElement("span");
  indicator.className = `category-priority-count ${level}`;
  indicator.title = level === "red" ? `${count} tareas críticas` : `${count} tareas en observación`;
  indicator.setAttribute("aria-label", indicator.title);
  indicator.textContent = count;
  indicator.insertAdjacentHTML("afterbegin", level === "red"
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 21 7.8v8.4L12 21l-9-4.8V7.8L12 3Z"/><path d="M12 8v5.5M12 17h.01"/>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6 22 20.4H2L12 3.6Z"/><path d="M12 9v5.2M12 17.5h.01"/>');
  return indicator;
}

// Crea los iconos de riesgo usando exclusivamente el color y la forma del indicador.
function createUrgencyIcon(urgency, category) {
  const icon = document.createElement("span");
  icon.className = "task-urgency-icon hidden";
  if (!urgency) return icon;
  icon.classList.remove("hidden");
  icon.classList.add(urgency.level === "red" ? "urgent-red" : "urgent-yellow");
  icon.title = `${urgency.elapsedDays} días transcurridos · plazo ${category.daysLimit} días`;
  icon.setAttribute("role", "img");
  icon.setAttribute("aria-label", urgency.level === "red" ? "Riesgo crítico" : "Advertencia de plazo");
  icon.innerHTML = urgency.level === "red"
    ? '<svg class="urgency-symbol urgency-red-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 21 7.8v8.4L12 21l-9-4.8V7.8L12 3Z"/><path d="M12 8v5.5M12 17h.01"/></svg>'
    : '<svg class="urgency-symbol urgency-yellow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6 22 20.4H2L12 3.6Z"/><path d="M12 9v5.2M12 17.5h.01"/></svg>';
  return icon;
}

// Botones de edición y archivo compartidos por Operacional y Contabilidad.
function createTaskActions() {
  const actions = document.createElement("span");
  actions.className = "task-actions dashboard-task-actions";
  actions.innerHTML = '<button class="task-action edit-task-button" type="button" title="Editar tarea" aria-label="Editar tarea"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z"/></svg></button><button class="task-action archive-task-button" type="button" title="Archivar tarea" aria-label="Archivar tarea"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4zM3 4h18v3H3zM9 12h6"/></svg></button>';
  return actions;
}

// Genera la fila de tarea operacional con checkbox, fecha, urgencia y botón Editar.
function renderDashboardTask(task, category, urgency) {
  const row = document.createElement("li");
  row.className = `task-item dashboard-task-row${task.completed ? " completed" : ""}`;
  row.draggable = true;
  row.dataset.taskId = task.id;
  row.dataset.categoryId = category.id;

  const handle = document.createElement("span");
  handle.className = "task-drag-handle dashboard-task-drag-handle";
  handle.textContent = "⠿";
  handle.title = "Arrastrar tarea para reordenar o mover";
  handle.setAttribute("aria-hidden", "true");

  const label = document.createElement("label");
  label.className = "task-main dashboard-task-main";
  const checkbox = document.createElement("input");
  checkbox.className = "task-checkbox";
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.dataset.taskId = task.id;
  checkbox.dataset.categoryId = category.id;
  checkbox.setAttribute("aria-label", `${task.completed ? "Marcar pendiente" : "Completar"}: ${task.text}`);
  const customCheckbox = document.createElement("span");
  customCheckbox.className = "custom-checkbox";
  customCheckbox.setAttribute("aria-hidden", "true");
  customCheckbox.innerHTML = "<span>✓</span>";
  const copy = document.createElement("span");
  copy.className = "dashboard-task-copy";
  const name = document.createElement("span");
  name.className = "task-name dashboard-task-name";
  name.textContent = task.text;
  name.title = task.text;
  copy.appendChild(name);
  if (task.completedAt) {
    const completedAt = document.createElement("small");
    completedAt.className = "dashboard-task-completion";
    completedAt.textContent = `Completada: ${formatSavedTimestamp(task.completedAt)}`;
    copy.appendChild(completedAt);
  }
  label.append(checkbox, customCheckbox, copy);

  const trailing = document.createElement("div");
  trailing.className = "dashboard-task-trailing";
  const date = document.createElement("span");
  date.className = "dashboard-task-date";
  date.textContent = formatDate(task.dueDate);
  trailing.append(date, createUrgencyIcon(urgency, category), createTaskActions());
  row.append(handle, label, trailing);
  return row;
}

// Contabilidad usa una lista lineal. La categoría se muestra debajo del nombre.
function renderAccountingTask(task, category, urgency) {
  const fragment = accountingTaskTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".accounting-task-row");
  row.dataset.taskId = task.id;
  row.dataset.categoryId = category.id;
  row.dataset.groupId = "contabilidad";
  if (task.completed) row.classList.add("completed");

  const checkbox = row.querySelector(".task-checkbox");
  checkbox.checked = task.completed;
  checkbox.dataset.taskId = task.id;
  checkbox.dataset.categoryId = category.id;
  checkbox.setAttribute("aria-label", `${task.completed ? "Marcar pendiente" : "Completar"}: ${task.text}`);
  row.querySelector(".accounting-task-name").textContent = task.text;
  row.querySelector(".accounting-task-subtitle").textContent = `${category.name} · ${formatDate(task.dueDate)}`;
  if (task.completedAt) {
    const completedAt = document.createElement("small");
    completedAt.className = "accounting-task-completion";
    completedAt.textContent = `Completada: ${formatSavedTimestamp(task.completedAt)}`;
    row.querySelector(".accounting-task-copy").appendChild(completedAt);
  }
  const urgencyIcon = createUrgencyIcon(urgency, category);
  row.querySelector(".accounting-task-trailing").replaceChild(urgencyIcon, row.querySelector(".accounting-task-trailing .task-urgency-icon"));
  return fragment;
}

// Mantiene el formulario único de alta con todas las categorías del usuario.
// Las categorías se agrupan por área para que el destino sea inequívoco.
function refreshDashboardQuickCategoryOptions() {
  const select = document.getElementById("dashboard-quick-category");
  const previousCategory = select.value;
  select.replaceChildren(new Option("Seleccionar categoría", ""));

  for (const [groupId, label] of [["operacional", "Operacional"], ["contabilidad", "Contabilidad"]]) {
    const categories = state.categories.filter(category => category.groupId === groupId);
    if (!categories.length) continue;
    const group = document.createElement("optgroup");
    group.label = label;
    for (const category of categories) {
      group.appendChild(new Option(category.name, category.id));
    }
    select.appendChild(group);
  }

  if (state.categories.some(category => category.id === previousCategory)) {
    select.value = previousCategory;
  } else {
    select.value = "";
  }

  const dateInput = document.getElementById("dashboard-quick-date");
  if (!dateInput.value) dateInput.value = formatDate(dateKey());
}

// Actualiza ambas áreas y los indicadores de riesgo al cambiar cualquier tarea.
function renderDashboard() {
  const operationalTarget = document.getElementById("operacional-categories");
  operationalTarget.replaceChildren();
  const operationalCategories = sortCategoriesByUrgency(state.categories.filter(category => category.groupId === "operacional"));
  for (const category of operationalCategories) operationalTarget.appendChild(renderCategory(category));
  if (!operationalCategories.length) {
    const empty = document.createElement("div");
    empty.className = "operational-empty-state";
    empty.textContent = "Aún no hay categorías operacionales. Usa + Categoría para crear la primera.";
    operationalTarget.appendChild(empty);
  }

  accountingList.replaceChildren();
  const accountingEntries = allActiveTasks().filter(({ category }) => category.groupId === "contabilidad");
  const sortedAccountingEntries = sortTaskEntries(accountingEntries);
  for (const item of sortedAccountingEntries) accountingList.appendChild(renderAccountingTask(item.task, item.category, item.urgency));
  if (!sortedAccountingEntries.length) {
    const empty = document.createElement("div");
    empty.className = "accounting-empty-note";
    empty.textContent = "No hay tareas contables registradas.";
    accountingList.appendChild(empty);
  }

  const operationalSection = document.querySelector('[data-group-id="operacional"].group-section');
  const accountingSection = document.querySelector('[data-group-id="contabilidad"].group-section');
  for (const [groupId, section] of [["operacional", operationalSection], ["contabilidad", accountingSection]]) {
    const collapsed = Boolean(state.collapsedGroups[groupId]);
    section.classList.toggle("collapsed", collapsed);
    const button = section.querySelector("[data-collapse-group]");
    button.setAttribute("aria-expanded", String(!collapsed));
    button.title = collapsed ? `Expandir ${groupId}` : `Minimizar ${groupId}`;
  }

  refreshDashboardQuickCategoryOptions();

  updateOverview();
  renderCategoryBarChart();
}

// ============================================================================
// 6. ANALÍTICA DEL DASHBOARD
//    Agrupa los dos niveles de riesgo en una tarjeta y muestra una barra por
//    categoría con el total de tareas activas (pendientes + completadas).
// ============================================================================
function renderCategoryBarChart() {
  // Cuenta tareas activas (pendientes y completadas) por categoría.
  const rows = state.categories.map((category, originalIndex) => {
    const stats = getCategoryTaskStats(category);
    return {
      category,
      originalIndex,
      total: stats.tasks.length,
      yellow: stats.yellow,
      red: stats.red,
      pending: stats.pending.length
    };
  });

  // Los gráficos de torta representan cada nivel de riesgo como proporción
  // de todas las tareas pendientes; las tareas completadas no participan.
  const pendingTotal = rows.reduce((sum, item) => sum + item.pending, 0);
  const yellowTotal = rows.reduce((sum, item) => sum + item.yellow, 0);
  const redTotal = rows.reduce((sum, item) => sum + item.red, 0);
  renderRiskMetric("yellow", yellowTotal, pendingTotal);
  renderRiskMetric("red", redTotal, pendingTotal);

  const chart = document.getElementById("category-count-chart");
  const totalNode = document.getElementById("category-count-total");
  if (!chart || !totalNode) return;

  const activeTaskTotal = rows.reduce((sum, item) => sum + item.total, 0);
  totalNode.textContent = `${activeTaskTotal} ${activeTaskTotal === 1 ? "tarea" : "tareas"}`;
  const maximum = Math.max(1, ...rows.map(item => item.total));
  const sortedRows = rows.sort((a, b) => b.total - a.total || a.originalIndex - b.originalIndex);
  const fragment = document.createDocumentFragment();
  chart.replaceChildren();

  // V4.4: el gráfico usa nombres reales y dinámicos, no un catálogo fijo.

  for (const item of sortedRows) {
    const column = document.createElement("div");
    column.className = "category-count-column";
    column.setAttribute("role", "listitem");
    column.title = `${item.category.name}: ${item.total} ${item.total === 1 ? "tarea" : "tareas"}`;

    const value = document.createElement("strong");
    value.className = "category-count-value";
    value.textContent = String(item.total);

    const track = document.createElement("span");
    track.className = "category-count-bar-track";
    track.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    fill.className = "category-count-bar-fill";
    fill.style.backgroundColor = item.category.color || (item.category.groupId === "contabilidad" ? "#a58abd" : "#5b9b8d");
    fill.style.height = item.total ? `${Math.max(4, (item.total / maximum) * 100)}%` : "0%";
    track.appendChild(fill);

    const label = document.createElement("span");
    label.className = "category-count-label";
    // El título conserva el nombre completo; el CSS lo trunca visualmente
    // cuando hay muchas categorías o nombres largos.
    label.textContent = item.category.name;
    label.title = item.category.name;
    label.setAttribute("aria-label", item.category.name);

    column.append(value, track, label);
    fragment.appendChild(column);
  }

  if (!sortedRows.length) {
    const empty = document.createElement("div");
    empty.className = "category-chart-empty";
    empty.textContent = "Crea categorías para comenzar";
    chart.appendChild(empty);
  } else {
    chart.replaceChildren(fragment);
  }
  chart.setAttribute("aria-label", `Gráfico de barras verticales con tareas activas por categoría. Total: ${activeTaskTotal} tareas.`);
}

// Actualiza el gráfico de torta de cada nivel de urgencia.
function renderRiskMetric(level, count, pendingTotal) {
  const percent = pendingTotal > 0 ? Math.round((count / pendingTotal) * 100) : 0;
  const countNode = document.getElementById(`${level}-count`);
  const shareNode = document.getElementById(`${level}-share`);
  const donut = document.getElementById(`${level}-donut`);
  const color = level === "red" ? "#df555d" : "#e5b13d";
  if (!countNode || !shareNode || !donut) return;

  countNode.textContent = String(count);
  shareNode.textContent = `${percent}%`;
  donut.style.background = `conic-gradient(${color} 0% ${percent}%, var(--chart-track, #edf0f2) ${percent}% 100%)`;
  const label = level === "red" ? "tareas críticas" : "tareas en observación";
  donut.setAttribute("aria-label", `${count} ${label}, ${percent}% de las tareas pendientes`);
}

// ============================================================================
// 7. ADMINISTRACIÓN CENTRALIZADA DE TAREAS
//    Tabla general con búsqueda, filtros y creación desde un solo formulario.
// ============================================================================
function updateTaskCategoryOptions(selectElement, groupId, selectedCategoryId = null) {
  const available = state.categories.filter(category => category.groupId === groupId);
  selectElement.replaceChildren();
  if (!available.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No hay categorías en esta área";
    selectElement.appendChild(option);
    return;
  }
  for (const category of available) {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    selectElement.appendChild(option);
  }
  if (selectedCategoryId && available.some(category => category.id === selectedCategoryId)) {
    selectElement.value = selectedCategoryId;
  }
}

function refreshCategoryFilterOptions() {
  const filter = document.getElementById("task-category-filter");
  const groupFilter = document.getElementById("task-group-filter").value;
  const previous = filter.value;
  filter.replaceChildren(new Option("Todas las categorías", "all"));
  const available = state.categories.filter(category => groupFilter === "all" || category.groupId === groupFilter);
  for (const category of available) {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    filter.appendChild(option);
  }
  if ([...filter.options].some(option => option.value === previous)) filter.value = previous;
  else filter.value = "all";
}

function makeUrgencyBadge(task, category) {
  const badge = document.createElement("span");
  badge.className = "manager-risk-icon hidden";
  const urgency = getUrgency(task, category);
  if (!urgency) return badge;
  badge.classList.remove("hidden");
  badge.classList.add(urgency.level === "red" ? "urgent-red" : "urgent-yellow");
  badge.title = `${urgency.elapsedDays} días desde la fecha registrada · plazo de ${category.daysLimit} días`;
  badge.setAttribute("role", "img");
  badge.setAttribute("aria-label", urgency.level === "red" ? "Riesgo crítico" : "Advertencia de plazo");
  badge.innerHTML = urgency.level === "red"
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 21 7.8v8.4L12 21l-9-4.8V7.8L12 3Z"/><path d="M12 8v5.5M12 17h.01"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6 22 20.4H2L12 3.6Z"/><path d="M12 9v5.2M12 17.5h.01"/></svg>';
  return badge;
}

function getVisibleTasks() {
  const query = document.getElementById("task-search-input").value.trim().toLocaleLowerCase("es-CL");
  const groupFilter = document.getElementById("task-group-filter").value;
  const categoryFilter = document.getElementById("task-category-filter").value;
  const statusFilter = document.getElementById("task-status-filter").value;

  return allActiveTasks().filter(({ task, category }) => {
    if (groupFilter !== "all" && category.groupId !== groupFilter) return false;
    if (categoryFilter !== "all" && category.id !== categoryFilter) return false;
    if (statusFilter === "pending" && task.completed) return false;
    if (statusFilter === "completed" && !task.completed) return false;
    if (query && !`${task.text} ${category.name} ${category.groupId}`.toLocaleLowerCase("es-CL").includes(query)) return false;
    return true;
  });
}

function renderTaskManager() {
  const allTasks = allActiveTasks();
  const pending = allTasks.filter(({ task }) => !task.completed);
  const completed = allTasks.filter(({ task }) => task.completed);
  const risks = allTasks.filter(({ task, category }) => getUrgency(task, category));
  document.getElementById("tasks-total-count").textContent = allTasks.length;
  document.getElementById("tasks-pending-count").textContent = pending.length;
  document.getElementById("tasks-completed-count").textContent = completed.length;
  document.getElementById("tasks-risk-count").textContent = risks.length;
  refreshCategoryFilterOptions();

  const list = document.getElementById("task-manager-list");
  list.replaceChildren();
  const visible = getVisibleTasks();
  for (const { task, category } of visible) {
    const rowFragment = managerRowTemplate.content.cloneNode(true);
    const row = rowFragment.querySelector(".task-manager-row");
    row.dataset.taskId = task.id;
    row.dataset.categoryId = category.id;
    if (task.completed) row.classList.add("is-completed");

    row.querySelector(".manager-task-title").textContent = task.text;
    const completedText = row.querySelector(".manager-task-completed");
    completedText.textContent = task.completedAt ? `Completada: ${formatSavedTimestamp(task.completedAt)}` : "";

    const areaPill = row.querySelector(".manager-area-pill");
    areaPill.textContent = category.groupId === "contabilidad" ? "Contabilidad" : "Operacional";
    areaPill.classList.add(category.groupId === "contabilidad" ? "area-accounting" : "area-operational");
    row.querySelector(".manager-category-name").textContent = category.name;
    row.querySelector(".manager-date-cell").textContent = formatDate(task.dueDate);
    const urgency = makeUrgencyBadge(task, category);
    row.querySelector(".manager-risk-cell").replaceChildren(urgency);

    const checkbox = row.querySelector(".manager-task-checkbox");
    checkbox.checked = task.completed;
    checkbox.dataset.taskId = task.id;
    checkbox.dataset.categoryId = category.id;
    row.querySelector(".manager-status-text").textContent = task.completed ? "Completada" : "Pendiente";
    list.appendChild(rowFragment);
  }
  document.getElementById("task-manager-empty").classList.toggle("hidden", visible.length !== 0);
}

function openCreateTaskDialog() {
  const form = document.getElementById("task-create-form");
  form.reset();
  const groupSelect = document.getElementById("new-task-group");
  const categorySelect = document.getElementById("new-task-category");
  groupSelect.value = state.categories.some(category => category.groupId === "operacional") ? "operacional" : "contabilidad";
  updateTaskCategoryOptions(categorySelect, groupSelect.value);
  document.getElementById("new-task-date").value = formatDate(dateKey());
  updateDeadlineHint("new-task-category", "new-task-deadline-hint");
  taskCreateDialog.showModal();
  document.getElementById("new-task-name").focus();
}

function updateDeadlineHint(categorySelectId, hintId) {
  const categoryId = document.getElementById(categorySelectId).value;
  const category = state.categories.find(item => item.id === categoryId);
  document.getElementById(hintId).textContent = category
    ? `Área: ${category.groupId === "contabilidad" ? "Contabilidad" : "Operacional"}. Plazo de referencia: ${category.daysLimit} ${category.daysLimit === 1 ? "día" : "días"}. La urgencia se calcula automáticamente.`
    : "Selecciona una categoría para calcular el plazo.";
}

// ============================================================================
// 8. VISTA DE ARCHIVADOS
//    Cada registro conserva el nombre histórico de área y subcategoría.
// ============================================================================
function renderArchive() {
  const list = document.getElementById("archive-list");
  list.replaceChildren();
  document.getElementById("archive-total").textContent = `${state.archived.length} ${state.archived.length === 1 ? "tarea archivada" : "tareas archivadas"}`;
  if (!state.archived.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Todavía no hay tareas archivadas. Las tareas que archives aparecerán aquí agrupadas por categoría.";
    list.appendChild(empty);
    return;
  }

  const categoryOrder = state.categories.map(category => category.id);
  const archiveGroups = new Map();
  for (const archived of state.archived) {
    const key = archived.categoryId || archived.categoryName || "sin-categoria";
    if (!archiveGroups.has(key)) archiveGroups.set(key, []);
    archiveGroups.get(key).push(archived);
  }
  const sortedKeys = [...archiveGroups.keys()].sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  for (const key of sortedKeys) {
    const items = archiveGroups.get(key);
    const first = items[0];
    const category = state.categories.find(item => item.id === first.categoryId);
    const archivedGroupId = first.groupId || category?.groupId || "operacional";
    const groupName = archivedGroupId === "contabilidad" ? "Contabilidad" : "Operacional";
    const fragment = archiveCategoryTemplate.content.cloneNode(true);
    fragment.querySelector(".archive-category-title").textContent = first.categoryName || category?.name || "Categoría anterior";
    fragment.querySelector(".archive-category-group").textContent = groupName;
    fragment.querySelector(".archive-category-count").textContent = `${items.length} ${items.length === 1 ? "tarea" : "tareas"}`;
    const ul = fragment.querySelector(".archived-list");

    for (const item of items) {
      const taskFragment = archivedTaskTemplate.content.cloneNode(true);
      taskFragment.querySelector(".archived-name").textContent = item.text;
      taskFragment.querySelector(".archived-date").textContent = `Fecha registrada: ${formatDate(item.dueDate)}`;
      taskFragment.querySelector(".archived-completion").textContent = item.completedAt ? `Completada: ${formatSavedTimestamp(item.completedAt)}` : "No completada";
      taskFragment.querySelector(".archived-meta").textContent = `Archivada: ${formatSavedTimestamp(item.archivedAt)}`;
      const restoreButton = taskFragment.querySelector(".restore-button");
      restoreButton.dataset.restoreId = item.id;
      restoreButton.dataset.categoryId = item.categoryId;
      ul.appendChild(taskFragment);
    }
    list.appendChild(fragment);
  }
}

// ============================================================================
// 9. OPERACIONES CRUD Y MOVIMIENTO DE TAREAS/CATEGORÍAS
// ============================================================================
function getTask(categoryId, taskId) {
  return (state.tasks[categoryId] || []).find(task => task.id === taskId) || null;
}

function addTask(categoryId, text, dueDate) {
  const category = state.categories.find(item => item.id === categoryId);
  if (!category || !parseDateKey(dueDate) || !text.trim()) return false;
  state.tasks[categoryId] ||= [];
  state.tasks[categoryId].push({
    id: makeId(),
    text: text.trim().slice(0, 120),
    completed: false,
    completedAt: null,
    dueDate,
    createdAt: new Date().toISOString()
  });
  saveState();
  renderAll();
  return true;
}

function toggleTask(categoryId, taskId, completed) {
  const task = getTask(categoryId, taskId);
  if (!task) return;
  task.completed = completed;
  task.completedAt = completed ? formatTimestamp() : null;
  saveState();
  renderAll();
}

function archiveTask(categoryId, taskId) {
  const category = state.categories.find(item => item.id === categoryId);
  if (!category) return;
  const tasks = state.tasks[categoryId] || [];
  const index = tasks.findIndex(task => task.id === taskId);
  if (index === -1) return;
  const [task] = tasks.splice(index, 1);
  state.archived.push({ ...task, categoryId, categoryName: category.name, groupId: category.groupId, archivedAt: formatTimestamp() });
  saveState();
  renderAll();
}

function deleteTask(categoryId, taskId) {
  const tasks = state.tasks[categoryId] || [];
  const index = tasks.findIndex(task => task.id === taskId);
  if (index < 0) return false;
  const task = tasks[index];
  const confirmed = window.confirm(`¿Eliminar definitivamente la tarea "${task.text}"?\n\nEsta acción no la enviará a Archivados y no se puede deshacer.`);
  if (!confirmed) return false;
  tasks.splice(index, 1);
  saveState();
  if (taskDialog.open) taskDialog.close();
  editingTask = null;
  renderAll();
  return true;
}

function restoreTask(taskId, categoryId) {
  const index = state.archived.findIndex(item => item.id === taskId);
  if (index === -1) return;
  const archived = state.archived[index];
  const targetCategoryId = state.categories.some(category => category.id === categoryId) ? categoryId : state.categories[0]?.id;
  if (!targetCategoryId) return;
  const { categoryId: oldCategoryId, categoryName, groupId, archivedAt, ...task } = archived;
  state.tasks[targetCategoryId] ||= [];
  state.tasks[targetCategoryId].push(task);
  state.archived.splice(index, 1);
  saveState();
  renderAll();
}

// Mueve/reordena tareas manteniendo las fechas, el estado y sus marcas de tiempo.
function moveTask(taskId, fromCategoryId, toCategoryId, targetTaskId = null) {
  const source = state.tasks[fromCategoryId] || [];
  const sourceIndex = source.findIndex(task => task.id === taskId);
  if (sourceIndex === -1 || !state.tasks[toCategoryId]) return;
  if (fromCategoryId === toCategoryId && targetTaskId === taskId) return;
  const [task] = source.splice(sourceIndex, 1);
  const destination = state.tasks[toCategoryId];
  let insertionIndex = targetTaskId ? destination.findIndex(item => item.id === targetTaskId) : -1;
  if (insertionIndex < 0) insertionIndex = destination.length;
  destination.splice(insertionIndex, 0, task);
  saveState();
  renderAll();
}

// Cambia una categoría de grupo y/o posición en la distribución del dashboard.
function moveCategory(categoryId, targetGroupId, targetCategoryId = null) {
  const index = state.categories.findIndex(category => category.id === categoryId);
  if (index === -1 || !["operacional", "contabilidad"].includes(targetGroupId)) return;
  if (targetCategoryId === categoryId && state.categories[index].groupId === targetGroupId) return;
  const [category] = state.categories.splice(index, 1);
  category.groupId = targetGroupId;
  let insertAt;
  if (targetCategoryId && targetCategoryId !== categoryId) insertAt = state.categories.findIndex(item => item.id === targetCategoryId);
  else insertAt = state.categories.reduce((last, item, idx) => item.groupId === targetGroupId ? idx : last, -1) + 1;
  if (insertAt < 0) insertAt = state.categories.length;
  state.categories.splice(insertAt, 0, category);
  saveState();
  renderAll();
}

// Prepara el formulario de edición con la categoría actual de la tarea.
function openTaskEditor(categoryId, taskId) {
  const task = getTask(categoryId, taskId);
  const category = state.categories.find(item => item.id === categoryId);
  if (!task || !category) return;
  editingTask = { categoryId, taskId };
  document.getElementById("edit-task-name").value = task.text;
  const groupSelect = document.getElementById("edit-task-group");
  groupSelect.value = category.groupId;
  updateTaskCategoryOptions(document.getElementById("edit-task-category"), category.groupId, categoryId);
  document.getElementById("edit-task-date").value = formatDate(task.dueDate);
  taskDialog.showModal();
  document.getElementById("edit-task-name").focus();
}

// Crea una subcategoría y la incorpora a la estructura existente sin borrar tareas.
function createCategory(name, groupId, daysLimit) {
  const cleanName = name.trim().slice(0, 40);
  if (!cleanName || !["operacional", "contabilidad"].includes(groupId)) return false;
  if (state.categories.some(category => category.name.toLocaleLowerCase("es-CL") === cleanName.toLocaleLowerCase("es-CL"))) {
    alert("Ya existe una categoría con ese nombre en tu cuenta.");
    return false;
  }
  const paletteIndex = state.categories.length % CHART_COLORS.length;
  const color = CHART_COLORS[paletteIndex];
  // categories.id es UUID en PostgreSQL; el nombre permanece como etiqueta visual.
  const id = makeId();
  state.categories.push({ id, name: cleanName, groupId, daysLimit: Math.max(1, Math.min(3650, Number(daysLimit) || 6)), color, bg: `${color}19` });
  state.tasks[id] = [];
  state.collapsedGroups[groupId] = false;
  saveState();
  renderAll();
  return true;
}

// ============================================================================
// 10. NAVEGACIÓN: el trabajo diario se gestiona desde Dashboard.
//     Archivados se mantiene como historial separado.
// ============================================================================
function setView(view) {
  if (!["dashboard", "archive"].includes(view)) view = "dashboard";
  currentView = view;
  dashboardView.classList.toggle("hidden", view !== "dashboard");
  tasksView.classList.add("hidden"); // La antigua vista Tareas ya no se utiliza.
  archiveView.classList.toggle("hidden", view !== "archive");

  const navMap = { dashboard: "dashboard-nav", archive: "archive-nav" };
  for (const [key, id] of Object.entries(navMap)) {
    const button = document.getElementById(id);
    const active = key === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  document.getElementById("breadcrumb-current").textContent = view === "dashboard" ? "Dashboard" : "Archivados";
  if (view === "archive") renderArchive();
}

// ============================================================================
// 11. EVENTOS: formularios, filtros, checkboxes, edición y archivado
// ============================================================================
for (const button of document.querySelectorAll(".nav-item")) {
  button.addEventListener("click", () => setView(button.dataset.view));
}

document.getElementById("add-task-open").addEventListener("click", openCreateTaskDialog);
addCategoryButton.addEventListener("click", () => {
  document.getElementById("new-category-name").value = "";
  document.getElementById("new-category-group").value = "operacional";
  document.getElementById("new-category-days").value = "6";
  categoryDialog.showModal();
  document.getElementById("new-category-name").focus();
});

// La categoría disponible depende del área principal seleccionada.
document.getElementById("new-task-group").addEventListener("change", event => {
  updateTaskCategoryOptions(document.getElementById("new-task-category"), event.target.value);
  updateDeadlineHint("new-task-category", "new-task-deadline-hint");
});
document.getElementById("new-task-category").addEventListener("change", () => updateDeadlineHint("new-task-category", "new-task-deadline-hint"));
document.getElementById("edit-task-group").addEventListener("change", event => {
  updateTaskCategoryOptions(document.getElementById("edit-task-category"), event.target.value);
});

// Crea la actividad desde el formulario centralizado.
document.getElementById("task-create-form").addEventListener("submit", event => {
  event.preventDefault();
  const name = document.getElementById("new-task-name").value.trim();
  const categoryId = document.getElementById("new-task-category").value;
  const dueDate = parseDisplayDate(document.getElementById("new-task-date").value);
  if (!name || !categoryId || !dueDate) {
    alert("Revisa el nombre, la categoría y la fecha. Usa el formato DD/MM/YYYY.");
    return;
  }
  if (addTask(categoryId, name, dueDate)) {
    taskCreateDialog.close();
    document.getElementById("task-search-input").value = "";
    document.getElementById("task-group-filter").value = "all";
    document.getElementById("task-category-filter").value = "all";
    document.getElementById("task-status-filter").value = "all";
    setView("tasks");
  }
});

// Filtros y búsqueda se aplican sobre los mismos registros del dashboard.
document.getElementById("task-search-input").addEventListener("input", renderTaskManager);
document.getElementById("task-group-filter").addEventListener("change", () => {
  document.getElementById("task-category-filter").value = "all";
  renderTaskManager();
});
document.getElementById("task-category-filter").addEventListener("change", renderTaskManager);
document.getElementById("task-status-filter").addEventListener("change", renderTaskManager);

// Checkboxes, formularios de alta rápida y acciones dentro del Dashboard.
categoryGrid.addEventListener("change", event => {
  const checkbox = event.target.closest(".task-checkbox");
  if (checkbox) toggleTask(checkbox.dataset.categoryId, checkbox.dataset.taskId, checkbox.checked);
});

// Alta rápida única: la categoría elegida determina el área y el destino de la tarea.
document.getElementById("dashboard-quick-add-form").addEventListener("submit", event => {
  event.preventDefault();
  const categoryId = document.getElementById("dashboard-quick-category").value;
  const nameInput = document.getElementById("dashboard-quick-name");
  const dateInput = document.getElementById("dashboard-quick-date");
  const name = nameInput.value.trim();
  const dueDate = parseDisplayDate(dateInput.value);

  if (!categoryId) {
    alert("Selecciona la categoría donde quieres registrar la tarea.");
    document.getElementById("dashboard-quick-category").focus();
    return;
  }
  if (!name || !dueDate) {
    alert("Escribe el nombre y una fecha válida en formato DD/MM/YYYY.");
    if (!name) nameInput.focus();
    else dateInput.focus();
    return;
  }

  if (addTask(categoryId, name, dueDate)) {
    nameInput.value = "";
    dateInput.value = formatDate(dateKey());
    nameInput.focus();
  }
});

categoryGrid.addEventListener("click", event => {
  const addCategory = event.target.closest("[data-add-category]");
  if (addCategory) {
    document.getElementById("new-category-name").value = "";
    document.getElementById("new-category-group").value = addCategory.dataset.addCategory;
    document.getElementById("new-category-days").value = "6";
    categoryDialog.showModal();
    document.getElementById("new-category-name").focus();
    return;
  }

  const archiveButton = event.target.closest(".archive-task-button");
  if (archiveButton) {
    const item = archiveButton.closest(".task-item");
    archiveTask(item.dataset.categoryId, item.dataset.taskId);
    return;
  }
  const editButton = event.target.closest(".edit-task-button");
  if (editButton) {
    const item = editButton.closest(".task-item");
    openTaskEditor(item.dataset.categoryId, item.dataset.taskId);
    return;
  }
  const collapseButton = event.target.closest("[data-collapse-group]");
  if (collapseButton) {
    const groupId = collapseButton.dataset.collapseGroup;
    state.collapsedGroups[groupId] = !state.collapsedGroups[groupId];
    saveState();
    renderDashboard();
  }
});

// Acciones de la lista central de tareas.
taskManagerList.addEventListener("change", event => {
  const checkbox = event.target.closest(".manager-task-checkbox");
  if (checkbox) toggleTask(checkbox.dataset.categoryId, checkbox.dataset.taskId, checkbox.checked);
});
taskManagerList.addEventListener("click", event => {
  const row = event.target.closest(".task-manager-row");
  if (!row) return;
  if (event.target.closest(".manager-edit-button")) openTaskEditor(row.dataset.categoryId, row.dataset.taskId);
  if (event.target.closest(".manager-archive-button")) archiveTask(row.dataset.categoryId, row.dataset.taskId);
});

// Guardar edición; si cambia la categoría, mueve la tarea sin recrearla.
document.getElementById("task-edit-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!editingTask) return;
  const oldCategoryId = editingTask.categoryId;
  const task = getTask(oldCategoryId, editingTask.taskId);
  const name = document.getElementById("edit-task-name").value.trim();
  const dueDate = parseDisplayDate(document.getElementById("edit-task-date").value);
  const newCategoryId = document.getElementById("edit-task-category").value;
  if (!task || !name || !dueDate || !state.categories.some(category => category.id === newCategoryId)) {
    alert("Revisa el nombre, el área, la categoría y la fecha. El formato requerido es DD/MM/YYYY.");
    return;
  }
  task.text = name.slice(0, 120);
  task.dueDate = dueDate;
  if (newCategoryId !== oldCategoryId) {
    state.tasks[oldCategoryId] = state.tasks[oldCategoryId].filter(item => item.id !== task.id);
    state.tasks[newCategoryId] ||= [];
    state.tasks[newCategoryId].push(task);
  }
  saveState();
  taskDialog.close();
  editingTask = null;
  renderAll();
});

// El borrado definitivo pide confirmación y no se mezcla con el archivado.
document.getElementById("task-delete-button").addEventListener("click", () => {
  if (editingTask) deleteTask(editingTask.categoryId, editingTask.taskId);
});

// Crear una categoría nueva sin afectar las tareas ya registradas.
document.getElementById("category-create-form").addEventListener("submit", event => {
  event.preventDefault();
  const name = document.getElementById("new-category-name").value;
  const groupId = document.getElementById("new-category-group").value;
  const daysLimit = Number(document.getElementById("new-category-days").value);
  if (!name.trim() || !Number.isInteger(daysLimit) || daysLimit < 1 || daysLimit > 3650) return;
  if (createCategory(name, groupId, daysLimit)) {
    categoryDialog.close();
    renderDashboard();
  }
});

// Restaurar registros archivados a su categoría original.
archiveView.addEventListener("click", event => {
  const button = event.target.closest("[data-restore-id]");
  if (button) restoreTask(button.dataset.restoreId, button.dataset.categoryId);
});

// Los botones Cancelar y X cierran el diálogo correspondiente.
for (const closeButton of document.querySelectorAll("[data-close-dialog]")) {
  closeButton.addEventListener("click", () => document.getElementById(closeButton.dataset.closeDialog).close());
}

// ============================================================================
// 12. ARRASTRAR Y SOLTAR
//     Se conserva en Dashboard y Tareas para reordenar o trasladar actividades.
// ============================================================================
function clearDragStyles() {
  document.querySelectorAll(".dragging, .drop-target").forEach(element => element.classList.remove("dragging", "drop-target"));
}

// En el Dashboard se puede mover una tarea entre tarjetas y reordenar categorías.
categoryGrid.addEventListener("dragstart", event => {
  const taskItem = event.target.closest(".task-item");
  const categoryHandle = event.target.closest(".category-drag-handle");
  if (taskItem) {
    dragPayload = { type: "task", taskId: taskItem.dataset.taskId, fromCategoryId: taskItem.dataset.categoryId };
    taskItem.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(dragPayload));
    return;
  }
  if (categoryHandle) {
    const card = categoryHandle.closest(".category-card");
    dragPayload = { type: "category", categoryId: card.dataset.categoryId };
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(dragPayload));
    return;
  }
  event.preventDefault();
});

categoryGrid.addEventListener("dragover", event => {
  if (!dragPayload) return;
  const targetCard = event.target.closest(".category-card, .accounting-task-row");
  const targetGroup = event.target.closest(".group-section");
  if (!targetCard && !targetGroup) return;
  event.preventDefault();
  if (dragPayload.type === "task" && targetCard) targetCard.classList.add("drop-target");
  else if (dragPayload.type === "category") {
    if (targetCard) targetCard.classList.add("drop-target");
    else targetGroup.classList.add("drop-target");
  }
  event.dataTransfer.dropEffect = "move";
});

categoryGrid.addEventListener("dragleave", event => {
  const card = event.target.closest(".category-card, .accounting-task-row, .group-section");
  if (card && !card.contains(event.relatedTarget)) card.classList.remove("drop-target");
});

categoryGrid.addEventListener("drop", event => {
  if (!dragPayload) return;
  const targetCard = event.target.closest(".category-card, .accounting-task-row");
  const targetGroup = event.target.closest(".group-section");
  if (!targetCard && !targetGroup) return;
  event.preventDefault();
  if (dragPayload.type === "task") {
    const destinationCategory = targetCard?.dataset.categoryId || state.categories.find(category => category.groupId === targetGroup?.dataset.groupId)?.id;
    const targetRow = event.target.closest(".task-item");
    if (destinationCategory) moveTask(dragPayload.taskId, dragPayload.fromCategoryId, destinationCategory, targetRow?.dataset.taskId || null);
  } else if (dragPayload.type === "category") {
    const groupId = targetGroup?.dataset.groupId;
    moveCategory(dragPayload.categoryId, groupId, targetCard?.dataset.categoryId || null);
  }
  dragPayload = null;
  clearDragStyles();
});
categoryGrid.addEventListener("dragend", () => { dragPayload = null; clearDragStyles(); });

// En la lista general, el orden se mantiene dentro de cada categoría; soltar una
// tarea sobre otra categoría también cambia la clasificación de forma inmediata.
taskManagerList.addEventListener("dragstart", event => {
  if (!event.target.closest(".manager-drag-handle")) {
    event.preventDefault();
    return;
  }
  const row = event.target.closest(".task-manager-row");
  if (!row) return;
  dragPayload = { type: "manager-task", taskId: row.dataset.taskId, fromCategoryId: row.dataset.categoryId };
  row.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", JSON.stringify(dragPayload));
});
taskManagerList.addEventListener("dragover", event => {
  if (dragPayload?.type !== "manager-task") return;
  const row = event.target.closest(".task-manager-row");
  if (!row || row.dataset.taskId === dragPayload.taskId) return;
  event.preventDefault();
  row.classList.add("drop-target");
  event.dataTransfer.dropEffect = "move";
});
taskManagerList.addEventListener("dragleave", event => {
  const row = event.target.closest(".task-manager-row");
  if (row && !row.contains(event.relatedTarget)) row.classList.remove("drop-target");
});
taskManagerList.addEventListener("drop", event => {
  if (dragPayload?.type !== "manager-task") return;
  const targetRow = event.target.closest(".task-manager-row");
  if (!targetRow || targetRow.dataset.taskId === dragPayload.taskId) return;
  event.preventDefault();
  moveTask(dragPayload.taskId, dragPayload.fromCategoryId, targetRow.dataset.categoryId, targetRow.dataset.taskId);
  dragPayload = null;
  clearDragStyles();
});
taskManagerList.addEventListener("dragend", () => { dragPayload = null; clearDragStyles(); });

// ============================================================================
// 13. ACTUALIZACIÓN GENERAL Y CAMBIO DE FECHA
// ============================================================================
function updateCurrentDate() {
  document.getElementById("current-date").textContent = todayLongLabel();
}

function renderAll() {
  renderDashboard();
  renderArchive();
  updateCurrentDate();
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    updateCurrentDate();
    if (dateKey() !== lastRenderedDate) {
      lastRenderedDate = dateKey();
      renderAll();
    }
  }
});

// Actualiza hora cada 30 segundos y recalcula el riesgo cuando cambia el día.
setInterval(() => {
  updateCurrentDate();
  const today = dateKey();
  if (today !== lastRenderedDate) {
    lastRenderedDate = today;
    renderAll();
  }
}, 30000);

// ============================================================================
// 14. SUPABASE: mapeo, migración única, sincronización y control de sesión
// ============================================================================
const supabaseClient = window.supabaseClient;

function timestampToIso(value) {
  if (!value || typeof value !== "string") return null;
  const localMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (localMatch) {
    const [, day, month, year, hour, minute] = localMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function timestampFromDatabase(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatTimestamp(date);
}

function localTaskCount(localState) {
  const active = Object.values(localState.tasks || {}).reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0);
  return active + (Array.isArray(localState.archived) ? localState.archived.length : 0);
}

function hasMeaningfulLocalConfiguration(localState) {
  return (localState.categories || []).some(category => {
    const standard = DEFAULT_CATEGORIES.find(item => item.name.toLocaleLowerCase("es-CL") === category.name.toLocaleLowerCase("es-CL"));
    return !standard || standard.groupId !== category.groupId || standard.daysLimit !== category.daysLimit;
  });
}

async function fetchCloudRows() {
  if (!supabaseClient) throw new Error("No se pudo inicializar supabase-js. Comprueba que el CDN esté disponible.");

  // Comprueba explícitamente que se ejecutó el script SQL complementario V4.0.
  const { error: categoryColumnsError } = await supabaseClient
    .from("categories").select("id,color,bg").limit(1);
  if (categoryColumnsError) {
    throw new Error(`No se pudo consultar categories (incluidas las columnas color y bg). Ejecuta primero 02_migration_visual_archive_fields.sql en SQL Editor. Detalle: ${categoryColumnsError.message}`);
  }
  const { error: taskColumnsError } = await supabaseClient
    .from("tasks").select("id,archived_category_name,archived_area").limit(1);
  if (taskColumnsError) {
    throw new Error(`No se pudo consultar tasks (incluidas las columnas de archivado). Ejecuta primero 02_migration_visual_archive_fields.sql en SQL Editor. Detalle: ${taskColumnsError.message}`);
  }

  let { data: categories, error: categoriesError } = await supabaseClient
    .from("categories").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (categoriesError) throw categoriesError;

  // V4.5: las categorías son totalmente dinámicas. No se insertan valores
  // predeterminados desde el cliente; cada usuario crea las suyas.

  const { data: tasks, error: tasksError } = await supabaseClient
    .from("tasks").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (tasksError) throw tasksError;
  return { categories: categories || [], tasks: tasks || [] };
}

function mapCloudRowsToState(rows, userId) {
  const preferences = (() => {
    try { return JSON.parse(localStorage.getItem(userPreferencesKey(userId)) || "{}"); }
    catch { return {}; }
  })();

  const categories = rows.categories.map((row, index) => {
    const fallback = DEFAULT_CATEGORIES.find(item => item.name.toLocaleLowerCase("es-CL") === row.name.toLocaleLowerCase("es-CL"));
    const color = row.color || fallback?.color || CHART_COLORS[index % CHART_COLORS.length];
    return {
      id: row.id,
      name: row.name,
      groupId: row.area === "contabilidad" ? "contabilidad" : "operacional",
      daysLimit: Math.max(1, Math.min(3650, Number(row.deadline_days) || fallback?.daysLimit || 6)),
      color,
      bg: row.bg || fallback?.bg || `${color}19`
    };
  });
  const categoryMap = new Map(categories.map(category => [category.id, category]));
  const tasks = Object.fromEntries(categories.map(category => [category.id, []]));
  const archived = [];

  for (const row of rows.tasks) {
    const category = categoryMap.get(row.category_id);
    if (!category) continue;
    const task = {
      id: row.id,
      text: row.title,
      completed: Boolean(row.completed_at),
      completedAt: timestampFromDatabase(row.completed_at),
      dueDate: row.reference_date,
      createdAt: row.created_at || new Date().toISOString()
    };
    if (row.archived_at) {
      archived.push({
        ...task,
        categoryId: row.category_id,
        categoryName: row.archived_category_name || category.name,
        groupId: row.archived_area || category.groupId,
        archivedAt: timestampFromDatabase(row.archived_at) || formatTimestamp()
      });
    } else {
      tasks[row.category_id].push(task);
    }
  }

  return {
    categories,
    tasks,
    archived,
    collapsedGroups: {
      operacional: Boolean(preferences.collapsedGroups?.operacional),
      contabilidad: Boolean(preferences.collapsedGroups?.contabilidad)
    }
  };
}

async function importLegacyStateToCloud(localState, remoteCategories) {
  const categoryRowsByName = new Map(remoteCategories.map(row => [row.name.toLocaleLowerCase("es-CL"), row]));
  const localToRemoteCategory = new Map();
  const localCategories = Array.isArray(localState.categories) ? localState.categories : DEFAULT_CATEGORIES;

  for (let index = 0; index < localCategories.length; index += 1) {
    const category = localCategories[index];
    const payload = {
      user_id: currentUser.id,
      name: category.name,
      area: category.groupId === "contabilidad" ? "contabilidad" : "operacional",
      deadline_days: Math.max(1, Math.min(3650, Number(category.daysLimit) || 6)),
      sort_order: (index + 1) * 10,
      color: category.color || null,
      bg: category.bg || null
    };
    const existing = categoryRowsByName.get(category.name.toLocaleLowerCase("es-CL"));
    let savedCategory;
    if (existing) {
      const { data, error } = await supabaseClient.from("categories").update(payload).eq("id", existing.id).select("*").single();
      if (error) throw error;
      savedCategory = data;
    } else {
      const { data, error } = await supabaseClient.from("categories").insert(payload).select("*").single();
      if (error) throw error;
      savedCategory = data;
      categoryRowsByName.set(category.name.toLocaleLowerCase("es-CL"), savedCategory);
    }
    localToRemoteCategory.set(category.id, savedCategory.id);
  }

  const rowsToInsert = [];
  for (const category of localCategories) {
    const remoteCategoryId = localToRemoteCategory.get(category.id);
    if (!remoteCategoryId) continue;
    const categoryTasks = Array.isArray(localState.tasks?.[category.id]) ? localState.tasks[category.id] : [];
    categoryTasks.forEach((task, index) => rowsToInsert.push({
      user_id: currentUser.id,
      category_id: remoteCategoryId,
      title: task.text,
      reference_date: parseDateKey(task.dueDate) ? task.dueDate : dateKey(),
      completed_at: task.completed ? (timestampToIso(task.completedAt) || new Date().toISOString()) : null,
      archived_at: null,
      archived_category_name: null,
      archived_area: null,
      sort_order: (index + 1) * 10,
      created_at: timestampToIso(task.createdAt) || new Date().toISOString()
    }));
  }

  (localState.archived || []).forEach((task, index) => {
    const remoteCategoryId = localToRemoteCategory.get(task.categoryId)
      || categoryRowsByName.get((task.categoryName || "").toLocaleLowerCase("es-CL"))?.id;
    if (!remoteCategoryId) return;
    rowsToInsert.push({
      user_id: currentUser.id,
      category_id: remoteCategoryId,
      title: task.text,
      reference_date: parseDateKey(task.dueDate) ? task.dueDate : dateKey(),
      completed_at: task.completed ? (timestampToIso(task.completedAt) || new Date().toISOString()) : null,
      archived_at: timestampToIso(task.archivedAt) || new Date().toISOString(),
      archived_category_name: task.categoryName || null,
      archived_area: task.groupId === "contabilidad" ? "contabilidad" : "operacional",
      sort_order: 100000 + index,
      created_at: timestampToIso(task.createdAt) || new Date().toISOString()
    });
  });

  for (let offset = 0; offset < rowsToInsert.length; offset += 100) {
    const { error } = await supabaseClient.from("tasks").insert(rowsToInsert.slice(offset, offset + 100));
    if (error) throw error;
  }
  return rowsToInsert.length;
}

function cloudCategoryRow(category, index) {
  return {
    id: category.id,
    user_id: currentUser.id,
    name: category.name,
    area: category.groupId === "contabilidad" ? "contabilidad" : "operacional",
    deadline_days: Math.max(1, Math.min(3650, Number(category.daysLimit) || 6)),
    sort_order: (index + 1) * 10,
    color: category.color || null,
    bg: category.bg || null
  };
}

function cloudTaskRows(snapshot) {
  const rows = [];
  for (const category of snapshot.categories) {
    (snapshot.tasks[category.id] || []).forEach((task, index) => rows.push({
      id: task.id,
      user_id: currentUser.id,
      category_id: category.id,
      title: task.text,
      reference_date: parseDateKey(task.dueDate) ? task.dueDate : dateKey(),
      completed_at: task.completed ? (timestampToIso(task.completedAt) || new Date().toISOString()) : null,
      archived_at: null,
      archived_category_name: null,
      archived_area: null,
      sort_order: (index + 1) * 10,
      created_at: timestampToIso(task.createdAt) || new Date().toISOString()
    }));
  }
  snapshot.archived.forEach((task, index) => rows.push({
    id: task.id,
    user_id: currentUser.id,
    category_id: task.categoryId,
    title: task.text,
    reference_date: parseDateKey(task.dueDate) ? task.dueDate : dateKey(),
    completed_at: task.completed ? (timestampToIso(task.completedAt) || new Date().toISOString()) : null,
    archived_at: timestampToIso(task.archivedAt) || new Date().toISOString(),
    archived_category_name: task.categoryName || null,
    archived_area: task.groupId === "contabilidad" ? "contabilidad" : "operacional",
    sort_order: 100000 + index,
    created_at: timestampToIso(task.createdAt) || new Date().toISOString()
  }));
  return rows;
}

function changedFields(before, after, fields) {
  const changes = {};
  for (const field of fields) {
    if (JSON.stringify(before?.[field] ?? null) !== JSON.stringify(after[field] ?? null)) {
      changes[field] = after[field];
    }
  }
  return changes;
}

async function persistCloudSnapshot(snapshot) {
  if (!currentUser) throw new Error("No hay una sesión autenticada.");
  const baseline = lastSyncedSnapshot || { categories: [], tasks: {}, archived: [] };
  const previousCategories = new Map((baseline.categories || []).map(category => [category.id, category]));
  const currentCategories = new Map(snapshot.categories.map(category => [category.id, category]));
  const categoryFields = ["name", "area", "deadline_days", "sort_order", "color", "bg"];

  // Inserta nuevas categorías y actualiza solo los campos que cambiaron.
  for (let index = 0; index < snapshot.categories.length; index += 1) {
    const category = snapshot.categories[index];
    const row = cloudCategoryRow(category, index);
    const previous = previousCategories.get(category.id);
    if (!previous) {
      const { error } = await supabaseClient.from("categories").upsert(row, { onConflict: "id" });
      if (error) throw error;
      continue;
    }
    const previousRow = cloudCategoryRow(previous, baseline.categories.findIndex(item => item.id === category.id));
    const changes = changedFields(previousRow, row, categoryFields);
    if (Object.keys(changes).length) {
      const { error } = await supabaseClient.from("categories").update(changes).eq("id", category.id).eq("user_id", currentUser.id);
      if (error) throw error;
    }
  }

  const previousTaskRows = new Map(cloudTaskRows(baseline).map(row => [row.id, row]));
  const currentRows = cloudTaskRows(snapshot);
  const currentTaskRows = new Map(currentRows.map(row => [row.id, row]));
  const taskFields = ["category_id", "title", "reference_date", "completed_at", "archived_at", "archived_category_name", "archived_area", "sort_order", "created_at"];

  // Las tareas nuevas se insertan; las existentes reciben solo los campos editados.
  for (const row of currentRows) {
    const previous = previousTaskRows.get(row.id);
    if (!previous) {
      const { error } = await supabaseClient.from("tasks").upsert(row, { onConflict: "id" });
      if (error) throw error;
      continue;
    }
    const changes = changedFields(previous, row, taskFields);
    if (Object.keys(changes).length) {
      const { error } = await supabaseClient.from("tasks").update(changes).eq("id", row.id).eq("user_id", currentUser.id);
      if (error) throw error;
    }
  }

  // Solo elimina IDs que estaban en la instantánea que cargó esta sesión y que
  // el usuario borró aquí. No elimina tareas nuevas creadas desde otro computador.
  const removedIds = [...previousTaskRows.keys()].filter(id => !currentTaskRows.has(id));
  for (let offset = 0; offset < removedIds.length; offset += 100) {
    const batch = removedIds.slice(offset, offset + 100);
    const { error } = await supabaseClient.from("tasks").delete().eq("user_id", currentUser.id).in("id", batch);
    if (error) throw error;
  }

  lastSyncedSnapshot = cloneAppState(snapshot);
}

function showAppGate(message, isError = false) {
  const gate = document.getElementById("app-gate");
  const copy = document.getElementById("app-gate-message");
  const retry = document.getElementById("app-gate-retry");
  const signIn = document.getElementById("app-gate-signin");
  if (copy) copy.textContent = message;
  if (retry) retry.classList.toggle("hidden", !isError);
  if (signIn) signIn.classList.toggle("hidden", !isError);
  if (gate) gate.classList.remove("hidden");
}

function hideAppGate() {
  document.getElementById("app-gate")?.classList.add("hidden");
  document.body.classList.remove("app-auth-pending");
}

async function initializeCloudApp() {
  showAppGate("Comprobando tu sesión y cargando tus tareas…");
  if (!supabaseClient) {
    showAppGate("No se pudo cargar Supabase. Comprueba la conexión a Internet y vuelve a intentarlo.", true);
    return;
  }

  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) {
    window.location.replace("login.html");
    return;
  }

  currentUser = sessionData.session.user;
  const emailLabel = document.getElementById("user-email-label");
  if (emailLabel) emailLabel.textContent = currentUser.email || "Usuario autenticado";
  setCloudStatus("Conectando con Supabase…", "saving");

  let remoteRows = await fetchCloudRows();
  // V4.5: la información de prueba se limpia en Supabase y se inicia desde cero.
  // No se reimporta la antigua caché local, para evitar que reaparezcan registros
  // de prueba después de ejecutar la limpieza administrativa de la base de datos.
  localStorage.setItem(`${STORAGE_KEY}:cloud-migration:${currentUser.id}`, `clean-start-v4.5:${new Date().toISOString()}`);

  state = mapCloudRowsToState(remoteRows, currentUser.id);
  lastSyncedSnapshot = cloneAppState(state);
  cloudReady = true;
  renderAll();
  setView("dashboard");
  setCloudStatus("Sincronizado con Supabase", "ok");
  hideAppGate();
}

// Reintento de carga cuando falla la red o la configuración de Data API/RLS.
document.getElementById("app-gate-retry")?.addEventListener("click", () => {
  initializeCloudApp().catch(error => showAppGate(`No se pudo conectar: ${error.message || error}`, true));
});

document.getElementById("logout-button")?.addEventListener("click", async () => {
  if (!supabaseClient) return;
  setCloudStatus("Cerrando sesión…", "saving");
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    setCloudStatus("No se pudo cerrar sesión", "error");
    window.alert(error.message);
    return;
  }
  window.location.replace("login.html");
});

// Si la sesión expira o se cierra desde otra pestaña, evita dejar datos visibles.
supabaseClient?.auth.onAuthStateChange(event => {
  if (event === "SIGNED_OUT") window.location.replace("login.html");
});

// Recalcula el riesgo al cambiar de día y mantiene el Dashboard actualizado.
async function refreshCloudStateIfIdle() {
  if (!cloudReady || !currentUser || cloudSaveTimer || cloudRefreshInFlight) return;
  cloudRefreshInFlight = true;
  try {
    await cloudSaveQueue;
    if (cloudSaveTimer) return;
    // Si falló una escritura anterior, reintenta guardar el estado local antes de
    // leer la nube; nunca reemplaza cambios pendientes con una versión remota vieja.
    if (cloudSyncErrorShown) {
      await persistCloudSnapshot(cloneAppState(state));
      cloudSyncErrorShown = false;
      setCloudStatus("Sincronizado con Supabase", "ok");
      return;
    }
    const remoteRows = await fetchCloudRows();
    state = mapCloudRowsToState(remoteRows, currentUser.id);
    lastSyncedSnapshot = cloneAppState(state);
    renderAll();
    setCloudStatus("Sincronizado con Supabase", "ok");
  } catch (error) {
    console.warn("No se pudo actualizar desde otro dispositivo:", error);
    setCloudStatus("Sin conexión con Supabase", "error");
  } finally {
    cloudRefreshInFlight = false;
  }
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && cloudReady) {
    updateCurrentDate();
    if (dateKey() !== lastRenderedDate) {
      lastRenderedDate = dateKey();
      renderAll();
    }
    refreshCloudStateIfIdle();
  }
});
window.addEventListener("focus", refreshCloudStateIfIdle);

setInterval(() => {
  if (!cloudReady) return;
  updateCurrentDate();
  const today = dateKey();
  if (today !== lastRenderedDate) {
    lastRenderedDate = today;
    renderAll();
  }
}, 30000);

// Primera carga: requiere sesión y obtiene los registros privados desde PostgreSQL.
initializeCloudApp().catch(error => {
  console.error("No se pudo iniciar la aplicación:", error);
  showAppGate(`No se pudo conectar con Supabase: ${error.message || error}`, true);
});
