// Configuración de Supabase (llave publishable, segura para el navegador)
const SUPABASE_URL = "https://chebwqmnbkllpcsvnlmm.supabase.co";
const SUPABASE_KEY = "sb_publishable_ekq5GVFiha-GU3uK97xyuA_K_UuadHY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
