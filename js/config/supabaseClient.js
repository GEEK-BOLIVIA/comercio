const supabaseUrl = 'https://bhbbjvcoujxzqaqjqnti.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_C_OFBl6KdorQVKjnHFBUyg_DamW_LmK'; 

const clientInstance = supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,      // Guarda la sesión en localStorage
        detectSessionInUrl: true,  // ¡VITAL! Lee el token de la URL de GitHub Pages
        autoRefreshToken: true     // Mantiene la sesión activa
    }
});

export { clientInstance as supabase };