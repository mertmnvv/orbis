import { createClient } from "npm:@supabase/supabase-js@2";

// Service role key ile RLS'i atlayan admin istemci.
// Yalnızca Edge Function içinde, kullanıcı bağlamı olmaksızın kullanılır.
export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
