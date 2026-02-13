import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etddfgnuwagrtgnvqcum.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZGRmZ251d2FncnRnbnZxY3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MTE0NjAsImV4cCI6MjA3NTk4NzQ2MH0.yv41fCSlGcuw09ynfJL9ZLz8hMKEGaKbn7qNNJCx7wo';

// シングルトンインスタンス
let supabaseInstance: SupabaseClient | null = null;

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}