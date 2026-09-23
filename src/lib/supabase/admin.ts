import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, hasSupabaseAdminEnv } from "@/lib/env";

export function createAdminClient() {
  if (!hasSupabaseAdminEnv()) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseSecretKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
