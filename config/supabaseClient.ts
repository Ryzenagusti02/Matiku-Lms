import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
    global: {
        fetch: (...args) =>
            fetch(...args).catch((err) => {
                console.error('[Supabase] Network error:', err);
                throw new Error(
                    'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
                );
            }),
    },
});
