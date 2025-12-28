/**
 * Supabase Auth Sync Utility
 * Syncs NextAuth users to Supabase Auth for RLS policy enforcement
 */

import "server-only";
import { createClient } from '@supabase/supabase-js';
import { db } from './db';
import { createHash } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn('Supabase credentials not configured. RLS policies will not work.');
    return null;
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdmin;
}

/**
 * CUID veya String ID'yi Supabase uyumlu UUID formatına çevirir.
 * Deterministiktir: Aynı Input her zaman aynı UUID'yi üretir.
 */
export function getUuidFromUserId(userId: string): string {
  // Eğer zaten UUID formatındaysa dokunma
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(userId)) {
    return userId;
  }

  // Değilse, SHA-1 hash kullanarak UUID formatına çevir
  const hash = createHash('sha1').update(userId).digest('hex');
  
  // UUID v5 benzeri formatlama (8-4-4-4-12)
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '5' + hash.substring(13, 16), // Version 5 işareti
    '8' + hash.substring(17, 20), // Variant işareti
    hash.substring(20, 32),
  ].join('-');
}

/**
 * Sync NextAuth user to Supabase Auth
 * Call this after user creation/login
 */
export async function syncUserToSupabaseAuth(
  userId: string,
  email: string,
  passwordHash?: string
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.warn('Cannot sync user to Supabase Auth: credentials not configured');
    return;
  }

  // ID Dönüştürme İşlemi
  const supabaseUserId = getUuidFromUserId(userId);

  try {
    // Check if user already exists in Supabase Auth
    const { data: existingUser, error: getUserError } = await admin.auth.admin.getUserById(supabaseUserId);
    
    if (existingUser?.user) {
      // User exists, update if needed
      // NextAuth ID'sini metadata'da saklıyoruz ki eşleşme kaybolmasın
      const { error: updateError } = await admin.auth.admin.updateUserById(supabaseUserId, {
        email,
        email_confirm: true,
        user_metadata: { original_nextauth_id: userId } 
      });

      if (updateError) {
        console.error('Failed to update user in Supabase Auth:', updateError);
      }
    } else {
      // Create new user in Supabase Auth
      const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + 'A1!';
      
      const { data, error: createError } = await admin.auth.admin.createUser({
        id: supabaseUserId, // Dönüştürülmüş UUID kullanılıyor
        email,
        email_confirm: true,
        password: randomPassword,
        user_metadata: { original_nextauth_id: userId } // Orijinal ID'yi sakla
      });

      if (createError) {
        // Hata varsa bile logla ama devam et
        console.error('Failed to create user in Supabase Auth:', createError);
      }
    }
  } catch (error) {
    console.error('Error syncing user to Supabase Auth:', error);
  }
}

/**
 * Sync all existing users to Supabase Auth
 * Useful for migration
 */
export async function syncAllUsersToSupabaseAuth(): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('Supabase credentials not configured in .env');
  }

  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
      },
    });

    console.log(`Syncing ${users.length} users to Supabase Auth...`);
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        await syncUserToSupabaseAuth(user.id, user.email);
        successCount++;
      } catch (error) {
        console.error(`Failed to sync user ${user.id}:`, error);
        failCount++;
      }
    }

    console.log(`Sync completed. Success: ${successCount}, Failed: ${failCount}`);
    
    if (failCount > 0) {
       throw new Error(`Sync finished with ${failCount} errors. Check console logs.`);
    }

  } catch (error) {
    console.error('Error syncing users:', error);
    throw error;
  }
}

/**
 * Remove user from Supabase Auth
 */
export async function removeUserFromSupabaseAuth(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  try {
    const supabaseUserId = getUuidFromUserId(userId);
    await admin.auth.admin.deleteUser(supabaseUserId);
  } catch (error) {
    console.error('Failed to remove user from Supabase Auth:', error);
  }
}