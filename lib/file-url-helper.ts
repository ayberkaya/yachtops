/**
 * Helper to generate file URLs for API responses
 * Returns signedUrl for Supabase Storage files or legacy fileUrl
 */

import { getSignedUrl } from "./supabase-storage";

/**
 * Get file URL for API response
 * Returns signedUrl if file is in Supabase Storage, otherwise returns fileUrl or null
 */
export async function getFileUrl(options: {
  fileUrl?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
}): Promise<string | null> {
  // Prefer Supabase Storage (new)
  if (options.storageBucket && options.storagePath) {
    try {
      return await getSignedUrl(options.storageBucket, options.storagePath);
    } catch (error) {
      console.error("Error generating signed URL:", error);
      // Fall back to fileUrl if signed URL generation fails
    }
  }

  // Fall back to legacy fileUrl (base64 or external URL)
  return options.fileUrl || null;
}

/**
 * Get file metadata for API response
 * Returns either signedUrl or {bucket, path} for client to request signedUrl
 */
export async function getFileResponse(options: {
  fileUrl?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}): Promise<{
  signedUrl?: string | null;
  bucket?: string | null;
  path?: string | null;
  fileUrl?: string | null; // Legacy fallback
  mimeType?: string | null;
  fileSize?: number | null;
}> {
  // If file is in Supabase Storage, generate signed URL
  if (options.storageBucket && options.storagePath) {
    try {
      const signedUrl = await getSignedUrl(options.storageBucket, options.storagePath);
      return {
        signedUrl,
        bucket: options.storageBucket,
        path: options.storagePath,
        mimeType: options.mimeType,
        fileSize: options.fileSize,
      };
    } catch (error) {
      console.error("Error generating signed URL:", error);
      // Fall back to returning bucket/path for client to request
      return {
        bucket: options.storageBucket,
        path: options.storagePath,
        mimeType: options.mimeType,
        fileSize: options.fileSize,
      };
    }
  }

  // Legacy: return fileUrl (base64 or external URL)
  return {
    fileUrl: options.fileUrl || null,
    mimeType: options.mimeType,
    fileSize: options.fileSize,
  };
}

