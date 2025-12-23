'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createSupabaseClient } from '@/lib/supabase-client';

interface FileUploadProps {
  /**
   * Category/folder name for organizing files (e.g., 'receipts', 'documents', 'images')
   */
  category: string;
  /**
   * Callback when upload succeeds
   * @param filePath The path of the uploaded file in storage
   * @param fileName The original file name
   */
  onUploadSuccess?: (filePath: string, fileName: string) => void;
  /**
   * Callback when upload fails
   */
  onUploadError?: (error: Error) => void;
  /**
   * Maximum file size in bytes (default: 50MB)
   */
  maxSizeBytes?: number;
  /**
   * Accepted file types (e.g., 'image/*', 'application/pdf')
   */
  accept?: string;
  /**
   * Whether to allow multiple file selection
   */
  multiple?: boolean;
  /**
   * Custom button text
   */
  buttonText?: string;
  /**
   * Whether to show upload progress
   */
  showProgress?: boolean;
}

/**
 * FileUpload component for direct client-side uploads to Supabase Storage
 * Uses custom JWT token from NextAuth session for RLS authentication
 * Files are uploaded to: helmops-files/{yachtId}/{category}/{fileName}
 */
export function FileUpload({
  category,
  onUploadSuccess,
  onUploadError,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB default
  accept,
  multiple = false,
  buttonText = 'Upload File',
  showProgress = true,
}: FileUploadProps) {
  const { data: session } = useSession();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate session and token
    if (!session?.user) {
      setError('You must be logged in to upload files');
      return;
    }

    const supabaseAccessToken = (session as any).supabaseAccessToken;
    if (!supabaseAccessToken) {
      setError('Authentication token not available. Please log out and log back in.');
      return;
    }

    const yachtId = session.user.yachtId;
    if (!yachtId) {
      setError('You must be assigned to a yacht to upload files');
      return;
    }

    setError(null);
    setSuccess(false);
    setUploading(true);
    setProgress(0);

    try {
      // Create authenticated Supabase client
      const supabase = createSupabaseClient(supabaseAccessToken);

      const fileArray = Array.from(files);
      
      // Process files sequentially
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        
        // Validate file size
        if (file.size > maxSizeBytes) {
          const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
          throw new Error(`File "${file.name}" exceeds maximum size of ${maxSizeMB}MB`);
        }

        // Generate file path: /{yachtId}/{category}/{timestamp}-{randomId}-{sanitizedFileName}
        // Path must start with / to match RLS policy expectations
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `/${yachtId}/${category}/${timestamp}-${randomId}-${sanitizedFileName}`;

        setProgress(25);

        // Upload file to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from('helmops-files')
          .upload(filePath, file, {
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600',
            upsert: false, // Don't overwrite existing files
          });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          throw new Error(
            uploadError.message || `Failed to upload file "${file.name}"`
          );
        }

        setProgress(100);

        // Call success callback
        if (onUploadSuccess && data) {
          onUploadSuccess(data.path, file.name);
        }
      }

      setSuccess(true);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (uploadError) {
      console.error('File upload failed:', uploadError);
      const errorMessage = uploadError instanceof Error 
        ? uploadError.message 
        : 'Upload failed';
      
      setError(errorMessage);
      
      if (onUploadError) {
        onUploadError(uploadError instanceof Error ? uploadError : new Error(errorMessage));
      }
    } finally {
      setUploading(false);
      // Reset progress after a delay
      setTimeout(() => {
        setProgress(0);
        setSuccess(false);
      }, 3000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !session?.user}
          className="flex items-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {buttonText}
            </>
          )}
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || !session?.user}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            File uploaded successfully
          </AlertDescription>
        </Alert>
      )}

      {showProgress && uploading && progress > 0 && progress < 100 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Uploading... {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

