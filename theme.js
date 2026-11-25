/*
 * APARIENCIA GLOBAL
 * Alterna los modos claro y nocturno, recuerda la preferencia en este navegador
 * y sincroniza el botón del Dashboard y el de inicio de sesión.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "gestor-admin-theme";
  const root = document.documentElement;
  const buttons = Array.from(document.querySelectorAll(".theme-toggle"));
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  function readSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
    } catch (_) {
      return root.dataset.theme === "dark" ? "dark" : "light";
    }
  }

  function updateButtons(theme) {
    const isDark = theme === "dark";
    buttons.forEach(button => {
      const label = button.querySelector(".theme-toggle-label");
      button.setAttribute("aria-pressed", String(isDark));
      button.setAttribute("aria-label", isDark ? "Activar modo claro" : "Activar modo nocturno");
      button.title = isDark ? "Cambiar a modo claro" : "Cambiar a modo nocturno";
      if (label) label.textContent = isDark ? "Modo claro" : "Modo nocturno";
    });
    if (themeColorMeta) themeColorMeta.setAttribute("content", isDark ? "#151b20" : "#f3f5f7");
  }

  function applyTheme(theme, persist = true) {
    const normalized = theme === "dark" ? "dark" : "light";
    root.dataset.theme = normalized;
    updateButtons(normalized);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, normalized); } catch (_) { /* La apariencia sigue activa en esta pestaña. */ }
    }
  }

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
    });
  });

  // Si el usuario cambia el tema en otra pestaña, esta también se actualiza.
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) applyTheme(event.newValue === "dark" ? "dark" : "light", false);
  });

  applyTheme(readSavedTheme(), false);
})();
