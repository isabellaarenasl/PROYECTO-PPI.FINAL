import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            storage: window.sessionStorage,
            persistSession: true,       // ← mantiene la sesión al recargar
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
)