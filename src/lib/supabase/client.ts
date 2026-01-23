import { createClient } from '@supabase/supabase-js'

// Note: supabaseAdmin cannot be used on the client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
