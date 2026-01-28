import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://htlrtgzhzvvsxqyzkevi.supabase.co",
  "sb_publishable_T8KSbI65LTeEkXi8GvM2wg_JQijyvBn",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
