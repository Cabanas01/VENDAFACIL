'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: { message: error.message, code: error.code }, success: false }
  }

  return { error: null, success: true };
}


export async function signup(formData: FormData) {
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  
  const supabase = createSupabaseServerClient();
  
  // By removing `emailRedirectTo`, Supabase will default to using the "Site URL"
  // configured in your Supabase project's auth settings (Auth > URL Configuration).
  // This is the most robust approach. Make sure it's set correctly in your Supabase dashboard.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: { message: error.message, code: error.code } }
  }

  return { error: null, data }
}
