import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxycoeaftdpfezcmewmv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWNvZWFmdGRwZmV6Y21ld212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzI2MzksImV4cCI6MjA5MjYwODYzOX0.qsqipo1udTzPahh8FjF1I0ZJBHh6THGV4d-oRw6XzgI';

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