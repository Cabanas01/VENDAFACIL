'use server'

/**
 * @fileOverview Ações de Autenticação (Server Side)
 * 
 * Seguindo a premissa de deixar o Supabase gerenciar as URLs de redirecionamento 
 * conforme configurado no Dashboard (Auth > URL Configuration).
 */

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
  
  // Removendo emailRedirectTo para usar o Site URL padrão do Supabase
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: { message: error.message, code: error.code } }
  }

  return { error: null, data }
}
