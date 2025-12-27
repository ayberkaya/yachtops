'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'

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

  // After successful authentication, get user role from database
  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { role: true },
    })

    if (user) {
      // Strict role-based routing
      if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
        revalidatePath('/', 'layout')
        redirect('/admin/owners')
      } else {
        // OWNER, CAPTAIN, CREW, and other roles go to dashboard
        revalidatePath('/', 'layout')
        redirect('/dashboard')
      }
    } else {
      // User not found in database, default to dashboard
      revalidatePath('/', 'layout')
      redirect('/dashboard')
    }
  } catch (dbError) {
    console.error("Error fetching user role:", dbError)
    // On error, default to dashboard
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }
}

