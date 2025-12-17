/**
 * Supabase Storage utility for file uploads and signed URLs
 * Uses service role key for server-side operations only
 */

import { createClient } from '@supabase/supabase-js';

// Bucket names for different file types
export const STORAGE_BUCKETS = {
  RECEIPTS: 'expense-receipts',
  MESSAGE_IMAGES: 'message-images',
  MESSAGE_ATTACHMENTS: 'message-attachments',
  VESSEL_DOCUMENTS: 'vessel-documents',
  CREW_DOCUMENTS: 'crew-documents',
  MAINTENANCE_DOCUMENTS: 'maintenance-documents',
} as const;

// Signed URL TTL: 1 hour (3600 seconds)
const SIGNED_URL_TTL = 3600;

// Server-side memoization cache for signed URLs
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Get Supabase client with service role key (server-side only)
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }

  // Create client with service role key (bypasses RLS, server-side only)
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Upload file to Supabase Storage
 * @param bucket Bucket name
 * @param path File path in bucket (should include unique identifier)
 * @param file File to upload
 * @param options Upload options
 * @returns Storage metadata
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Buffer,
  options: {
    contentType?: string;
    cacheControl?: string;
    upsert?: boolean;
  } = {}
): Promise<{
  bucket: string;
  path: string;
  mimeType: string;
  size: number;
}> {
  const supabase = getSupabaseClient();

  // Ensure bucket exists (idempotent)
  // Try to create bucket, but ignore error if it already exists
  const { error: bucketError } = await supabase.storage.createBucket(bucket, {
    public: false, // Private bucket
    fileSizeLimit: 50 * 1024 * 1024, // 50MB max
  });

  // Ignore error if bucket already exists (common case)
  if (bucketError) {
    const errorMessage = bucketError.message || '';
    if (!errorMessage.includes('already exists') && 
        !errorMessage.includes('duplicate') &&
        !errorMessage.toLowerCase().includes('bucket')) {
      // Only throw if it's a real error, not "already exists"
      console.error(`Error creating bucket ${bucket}:`, bucketError);
      throw new Error(`Failed to create bucket: ${bucketError.message}`);
    }
    // Otherwise, bucket exists and we can proceed
  }

  // Convert File to Buffer if needed
  let buffer: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    buffer = file;
  }

  const contentType = options.contentType || 'application/octet-stream';
  const mimeType = contentType;

  // Upload file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      cacheControl: options.cacheControl || 'public, max-age=31536000, immutable',
      upsert: options.upsert ?? true,
    });

  if (error) {
    console.error(`Error uploading to ${bucket}/${path}:`, error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return {
    bucket,
    path: data.path,
    mimeType,
    size: buffer.length,
  };
}

/**
 * Get signed URL for private file (with caching)
 * @param bucket Bucket name
 * @param path File path in bucket
 * @param expiresIn TTL in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = SIGNED_URL_TTL
): Promise<string> {
  // Check cache first
  const cacheKey = `${bucket}/${path}`;
  const cached = signedUrlCache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error(`Error creating signed URL for ${bucket}/${path}:`, error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  // Cache the signed URL (expires slightly before actual expiry for safety)
  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: Date.now() + (expiresIn - 60) * 1000, // 60 seconds buffer
  });

  return data.signedUrl;
}

/**
 * Delete file from Supabase Storage
 * @param bucket Bucket name
 * @param path File path in bucket
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.error(`Error deleting ${bucket}/${path}:`, error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }

  // Remove from cache
  const cacheKey = `${bucket}/${path}`;
  signedUrlCache.delete(cacheKey);
}

/**
 * Check if file exists in storage
 * @param bucket Bucket name
 * @param path File path in bucket
 */
export async function fileExists(bucket: string, path: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage.from(bucket).list(path.split('/').slice(0, -1).join('/'), {
    search: path.split('/').pop() || '',
  });

  if (error) {
    return false;
  }

  return (data || []).some((file) => file.name === path.split('/').pop());
}

/**
 * Generate unique file path with timestamp and random ID
 * @param prefix Path prefix (e.g., 'receipts', 'images')
 * @param filename Original filename
 * @returns Unique path
 */
export function generateFilePath(prefix: string, filename: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = filename.split('.').pop() || 'bin';
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `${prefix}/${timestamp}-${randomId}-${sanitizedFilename}`;
}

