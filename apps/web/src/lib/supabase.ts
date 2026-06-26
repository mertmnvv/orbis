import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('[Supabase] env vars missing — running in mock mode');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
