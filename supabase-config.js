/*
 * CONFIGURACIÓN PÚBLICA DE SUPABASE
 * Esta aplicación utiliza una publishable key en el navegador.
 * No colocar aquí una sb_secret_ ni una service_role key.
 */
(() => {
  "use strict";

  const SUPABASE_URL = "https://zivdxtjcbkufcybtmjym.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_58bVm6n3JP1fs7Ao1py3dw_OpWNiKLS";

  if (!window.supabase?.createClient) {
    console.error("No se cargó la biblioteca supabase-js. Revisa la conexión a Internet o el CDN.");
    return;
  }

  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    }
  );
})();
