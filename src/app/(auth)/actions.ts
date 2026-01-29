'use server'

import { createServerActionClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: { message: error.message, code: error.code } }
  }

  // Redirect is managed on the server, ensuring a clean navigation
  // after the session is set.
  redirect('/dashboard')
}


export async function signup(formData: FormData) {
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return { error: { message: 'Missing NEXT_PUBLIC_SITE_URL environment variable.' } }
  }


  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: { message: error.message, code: error.code } }
  }

  return { error: null, data }
}
