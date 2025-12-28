'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { signIn } from '@/lib/auth-config'
import { UserRole } from '@prisma/client'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const rememberMe = formData.get('rememberMe') === 'on' || formData.get('rememberMe') === 'true'

  // Validate inputs
  if (!email || !password) {
    return redirect('/login?message=Email and password are required')
  }

  console.log("Attempting login for:", email)

  try {
    // Use NextAuth signIn instead of Supabase Auth
    const result = await signIn('credentials', {
      email,
      password,
      rememberMe: rememberMe.toString(),
      redirect: false,
    })

    if (result?.error) {
      console.log("🛑 NextAuth Login Error:", result.error)
      return redirect('/login?message=Could not authenticate user')
    }

    if (result?.ok) {
      // Get user role from session to determine redirect
      const { auth } = await import('@/lib/auth-config')
      const session = await auth()
      
      if (session?.user?.role) {
        // Strict role-based routing
        if (session.user.role === UserRole.ADMIN || session.user.role === UserRole.SUPER_ADMIN) {
          revalidatePath('/', 'layout')
          redirect('/admin/owners')
        } else {
          // OWNER, CAPTAIN, CREW, and other roles go to dashboard
          revalidatePath('/', 'layout')
          redirect('/dashboard')
        }
      } else {
        // Default to dashboard if role not found
        revalidatePath('/', 'layout')
        redirect('/dashboard')
      }
    } else {
      return redirect('/login?message=Could not authenticate user')
    }
  } catch (error) {
    console.error("Error during login:", error)
    return redirect('/login?message=Could not authenticate user')
  }
}

