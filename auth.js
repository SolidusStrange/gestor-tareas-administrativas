/* Supabase Auth para el acceso privado por invitación. */
(() => {
  "use strict";
  const client = window.supabaseClient;
  const loginView = document.getElementById("login-view");
  const setupView = document.getElementById("password-setup-view");
  const feedback = document.getElementById("auth-feedback");
  const loginForm = document.getElementById("login-form");
  const setupForm = document.getElementById("password-setup-form");

  function setFeedback(message, kind = "") {
    feedback.textContent = message;
    feedback.classList.toggle("error", kind === "error");
    feedback.classList.toggle("success", kind === "success");
  }

  function showPasswordSetup() {
    loginView.classList.add("hidden");
    setupView.classList.remove("hidden");
    setFeedback("Invitación verificada. Establece tu contraseña para activar la cuenta.", "success");
  }

  async function initializeLogin() {
    if (!client) {
      setFeedback("No se pudo cargar Supabase. Revisa tu conexión a Internet.", "error");
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const inviteFlow = query.get("type") === "invite" || query.get("type") === "recovery"
      || hash.get("type") === "invite" || hash.get("type") === "recovery" || query.has("code");

    const { data, error } = await client.auth.getSession();
    if (error) {
      setFeedback(error.message, "error");
      return;
    }

    if (inviteFlow && data.session) {
      showPasswordSetup();
      return;
    }
    if (data.session) {
      window.location.replace("index.html");
      return;
    }

    if (inviteFlow && !data.session) {
      setFeedback("El enlace de invitación no pudo validarse. Solicita una nueva invitación al administrador.", "error");
    }
  }

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = document.getElementById("login-submit");
    const email = loginForm.elements.email.value.trim();
    const password = loginForm.elements.password.value;
    button.disabled = true;
    setFeedback("Verificando credenciales…");
    try {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setFeedback("Acceso correcto. Abriendo tu Dashboard…", "success");
      window.location.replace("index.html");
    } catch (error) {
      setFeedback(error.message || "No se pudo iniciar sesión.", "error");
      button.disabled = false;
    }
  });

  setupForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = document.getElementById("password-setup-submit");
    const password = setupForm.elements.password.value;
    const confirmation = setupForm.elements["password-confirm"].value;
    if (password.length < 8) {
      setFeedback("La contraseña debe tener al menos 8 caracteres.", "error");
      return;
    }
    if (password !== confirmation) {
      setFeedback("Las contraseñas no coinciden.", "error");
      return;
    }
    button.disabled = true;
    setFeedback("Guardando contraseña…");
    const { error } = await client.auth.updateUser({ password });
    if (error) {
      setFeedback(error.message, "error");
      button.disabled = false;
      return;
    }
    setFeedback("Contraseña guardada. Abriendo tu Dashboard…", "success");
    window.location.replace("index.html");
  });

  client?.auth.onAuthStateChange(event => {
    if (event === "PASSWORD_RECOVERY") showPasswordSetup();
  });

  initializeLogin().catch(error => setFeedback(error.message || "Error de autenticación.", "error"));
})();
