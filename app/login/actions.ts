'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Validate inputs
  if (!email || !password) {
    return redirect('/login?message=Email and password are required')
  }

  console.log("Attempting login for:", email)

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Security: Never log or expose the password in any error message or URL
    // Use a generic error message to prevent user enumeration
    console.log("🛑 Supabase Login Error:", error.message)
    console.log("🛑 Error Details:", error)
    return redirect('/login?message=Could not authenticate user')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

