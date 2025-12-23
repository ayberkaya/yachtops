/**
 * Client-side Supabase helper for authenticated Storage operations
 * Uses custom JWT token from NextAuth session to authenticate with Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
}

// Assert that supabaseUrl is defined (TypeScript type narrowing)
const SUPABASE_URL: string = supabaseUrl;

/**
 * Create a Supabase client with custom JWT authentication
 * @param accessToken The Supabase access token from NextAuth session
 * @returns Authenticated Supabase client
 */
export function createSupabaseClient(accessToken: string): SupabaseClient {
  if (!accessToken) {
    throw new Error('Access token is required to create Supabase client');
  }

  // Pass the access token as the anon key parameter
  // Supabase client will use it for authentication
  return createClient(SUPABASE_URL, accessToken, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

/**
 * Get Supabase client for anonymous operations (no auth required)
 * Note: This should only be used for public operations
 */
export function getAnonymousSupabaseClient(): SupabaseClient {
  // Use anon key if available, otherwise use empty string (will fail for protected operations)
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  return createClient(SUPABASE_URL, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

