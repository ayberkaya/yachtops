'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { compressImage } from '@/lib/image-compression';
import { storeFileOffline, getOfflineFile, deleteOfflineFile } from '@/lib/offline-file-storage';
import { offlineQueue } from '@/lib/offline-queue';
import { createSupabaseClient } from '@/lib/supabase-client';
import { apiClient } from '@/lib/api-client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReceiptUploadProps {
  expenseId: string;
  onUploadSuccess?: (receiptId: string) => void;
  onUploadError?: (error: Error) => void;
  maxFiles?: number;
  existingReceipts?: number;
}

export function ReceiptUpload({
  expenseId,
  onUploadSuccess,
  onUploadError,
  maxFiles = 10,
  existingReceipts = 0,
}: ReceiptUploadProps) {
  const { data: session, status } = useSession();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'pending' | 'success' | 'error'>>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate session and authentication
    if (!session?.user) {
      setError('You must be logged in to upload receipts');
      return;
    }

    // Debug logging for authentication status
    console.log('[Receipt Upload Debug] Session Status:', status);
    console.log('[Receipt Upload Debug] Token Available:', !!(session as any)?.supabaseAccessToken);
    console.log('[Receipt Upload Debug] Yacht ID:', session?.user?.yachtId);
    console.log('[Receipt Upload Debug] User ID:', session?.user?.id);

    const supabaseAccessToken = (session as any).supabaseAccessToken;
    
    if (!supabaseAccessToken) {
      console.error('[Receipt Upload Debug] Missing Supabase Access Token');
      console.error('[Receipt Upload Debug] Session status:', status);
      console.error('[Receipt Upload Debug] Session keys:', session ? Object.keys(session) : 'no session');
      setError('Authentication token not available. Please refresh the page (F5) or log out and log back in.');
      return;
    }

    // Validate token is not empty string
    if (typeof supabaseAccessToken !== 'string' || supabaseAccessToken.trim() === '') {
      console.error('[Receipt Upload Debug] Invalid Supabase Access Token (empty or not string)');
      setError('Authentication token is invalid. Please refresh the page or log out and log back in.');
      return;
    }

    // CRITICAL: Retrieve Yacht ID - required for RLS-compliant path
    const yachtId = session.user.yachtId;
    if (!yachtId) {
      console.error('[Receipt Upload Debug] Missing Yacht ID');
      throw new Error('Yacht ID missing - user must be assigned to a yacht to upload receipts');
    }

    // Check file count limit
    const totalFiles = existingReceipts + files.length;
    if (totalFiles > maxFiles) {
      setError(`Maximum ${maxFiles} receipts allowed. You already have ${existingReceipts} receipts.`);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const fileArray = Array.from(files);
      
      // Process files sequentially to avoid overwhelming the system
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const fileId = `receipt_${Date.now()}_${i}`;
        
        setUploadStatus(prev => ({ ...prev, [fileId]: 'pending' }));
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        try {
          // Step 1: Compress image
          setUploadProgress(prev => ({ ...prev, [fileId]: 25 }));
          const compressedFile = await compressImage(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            initialQuality: 0.85,
          });

          // Step 2: Check if online - always try direct upload first when online
          const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
          console.log("🌐 Network Status:", isOnline ? "ONLINE" : "OFFLINE");
          console.log("🌐 navigator.onLine:", navigator.onLine);
          console.log("🌐 offlineQueue.online:", offlineQueue.online);

          if (isOnline) {
            // Online - ALWAYS try direct upload first
            setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));
            
            try {
              // Create authenticated Supabase client
              console.log('[Receipt Upload Debug] Creating Supabase client with token length:', supabaseAccessToken.length);
              const supabase = createSupabaseClient(supabaseAccessToken);
              console.log('[Receipt Upload Debug] Supabase client created successfully');

              // CRITICAL: Generate file path MUST start with yachtId for RLS compliance
              // Format: {yachtId}/{category}/{filename} (NO leading slash - verified working pattern)
              // RLS policy checks: split_part(name, '/', 1) = get_jwt_yacht_id()
              
              // Construct filename: timestamp-sanitized-original-name
              const fileName = `${Date.now()}-${compressedFile.name.replace(/[^a-zA-Z0-9.]/g, '-')}`;
              
              // Construct path: yachtId/receipts/filename (MUST START WITH YACHT ID)
              const filePath = `${yachtId}/receipts/${fileName}`;
              
              // Validate path format before upload
              if (!filePath.startsWith(`${yachtId}/`)) {
                throw new Error(`Invalid path format: Path must start with ${yachtId}/ but got ${filePath}`);
              }
              
              // Log upload path for verification
              console.log("📤 Uploading to path:", filePath);
              
              // Additional debug info
              console.log("🚀 Attempting Direct Upload (Online)...");
              console.log("🆔 Yacht ID:", yachtId);
              console.log("📦 Bucket Name: helmops-files");
              console.log("📏 File Size:", compressedFile.size, "bytes");
              console.log("📄 File Type:", compressedFile.type);
              console.log("📝 Original File Name:", compressedFile.name);
              console.log("📝 Generated File Name:", fileName);
              console.log("🔑 Token Length:", supabaseAccessToken.length);

              // Upload to Supabase Storage using authenticated client
              // Note: Supabase upload returns { data, error } - it does NOT throw by default
              const { data, error } = await supabase.storage
                .from('helmops-files')
                .upload(filePath, compressedFile, {
                  contentType: compressedFile.type || 'image/jpeg',
                  cacheControl: '3600',
                  upsert: false,
                });

              // ✅ After Upload Call: Detailed error/success logging
              if (error) {
                console.error("❌ Direct Upload Failed (Supabase Error):", error);
                console.error("❌ Error Message:", error.message);
                console.error("❌ Error Name:", error.name);
                console.error("❌ Error Status Code:", (error as any).statusCode);
                console.error("❌ Full Error Object:", JSON.stringify(error, null, 2));
                console.error("❌ Target Path That Failed:", filePath);
                console.error("❌ Yacht ID Used:", yachtId);
                console.warn("⚠️ Direct upload failed, falling back to offline queue...");
                
                // Fallback to offline queue if direct upload fails
                throw new Error(`DIRECT_UPLOAD_FAILED: ${error.message || 'Failed to upload receipt'}`);
              } else {
                console.log("✅ Direct Upload Success Data:", data);
                console.log("✅ Uploaded Path:", data?.path);
                console.log("✅ Full Path Used:", filePath);
              }

              if (!data) {
                console.error("❌ Upload returned no data and no error");
                console.error("❌ This is unexpected - Supabase should return data on success");
                throw new Error('Upload failed: No data returned from Supabase Storage');
              }

              // Use the data variable for the rest of the flow
              const uploadData = data;

              // Prepare the request body
              const requestBody = {
                storageBucket: 'helmops-files',
                storagePath: uploadData.path,
                mimeType: compressedFile.type || 'image/jpeg',
                fileSize: compressedFile.size,
              };
              
              console.log('[Receipt Upload Debug] Request body:', JSON.stringify(requestBody));
              console.log('[Receipt Upload Debug] Request body type:', typeof requestBody);
              console.log('[Receipt Upload Debug] API endpoint:', `/api/expenses/${expenseId}/receipt`);

              // Now create the receipt record via API with storage metadata
              const response = await apiClient.post<{ id: string }>(
                `/api/expenses/${expenseId}/receipt`,
                requestBody,
                {
                  queueOnOffline: false,
                }
              );

              setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
              setUploadStatus(prev => ({ ...prev, [fileId]: 'success' }));
              
              if (onUploadSuccess) {
                onUploadSuccess(response.data.id);
              }
            } catch (uploadError) {
              // If direct upload fails, fallback to offline queue
              const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
              console.warn("⚠️ Direct upload failed, storing in offline queue:", errorMessage);
              
              // Check if this is a network error or a Supabase error
              const isNetworkError = uploadError instanceof TypeError || 
                                    (uploadError instanceof Error && errorMessage.includes('fetch')) ||
                                    (uploadError instanceof Error && errorMessage.includes('network'));
              
              if (isNetworkError || !navigator.onLine) {
                // Network issue - store offline
                console.log("📦 Storing file offline due to network error");
                const storedFileId = await storeFileOffline(compressedFile, {
                  expenseId,
                });

                await offlineQueue.enqueueFileUpload(
                  storedFileId,
                  `/api/expenses/${expenseId}/receipt`,
                  'POST',
                  {
                    expenseId,
                    yachtId,
                    category: 'receipts',
                  }
                );

                setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
                setUploadStatus(prev => ({ ...prev, [fileId]: 'pending' }));
                setError('Files stored offline. They will upload automatically when connection is restored.');
              } else {
                // Other error (RLS, auth, etc.) - re-throw to show error
                throw uploadError;
              }
            }
          } else {
            // Offline - store and queue immediately
            console.log("📦 Device is offline, storing file in offline queue");
            setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));
            
            const storedFileId = await storeFileOffline(compressedFile, {
              expenseId,
            });

            // Store metadata for offline sync
            await offlineQueue.enqueueFileUpload(
              storedFileId,
              `/api/expenses/${expenseId}/receipt`,
              'POST',
              {
                expenseId,
                yachtId, // Store yachtId for path construction during sync
                category: 'receipts',
              }
            );

            setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
            setUploadStatus(prev => ({ ...prev, [fileId]: 'pending' }));
            
            // Show offline message
            setError('Files stored offline. They will upload automatically when connection is restored.');
          }
        } catch (uploadError) {
          console.error(`Failed to upload receipt ${file.name}:`, uploadError);
          setUploadStatus(prev => ({ ...prev, [fileId]: 'error' }));
          
          const errorMessage = uploadError instanceof Error 
            ? uploadError.message 
            : 'Upload failed';
          
          if (onUploadError) {
            onUploadError(new Error(errorMessage));
          } else {
            setError(`Failed to upload ${file.name}: ${errorMessage}`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing receipts:', error);
      setError('Failed to process receipts');
      if (onUploadError) {
        onUploadError(error instanceof Error ? error : new Error('Unknown error'));
      }
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const pendingCount = Object.values(uploadStatus).filter(s => s === 'pending').length;
  const successCount = Object.values(uploadStatus).filter(s => s === 'success').length;
  const errorCount = Object.values(uploadStatus).filter(s => s === 'error').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || existingReceipts >= maxFiles}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Uploading...' : 'Upload Receipts'}
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || existingReceipts >= maxFiles}
        />

        {existingReceipts > 0 && (
          <span className="text-sm text-muted-foreground">
            {existingReceipts} / {maxFiles} receipts
          </span>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {pendingCount > 0 && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            {pendingCount} file(s) queued for upload when connection is restored.
          </AlertDescription>
        </Alert>
      )}

      {successCount > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successCount} file(s) uploaded successfully.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload progress indicators */}
      {Object.entries(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileId, progress]) => {
            const status = uploadStatus[fileId];
            return (
              <div key={fileId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {status === 'pending' && '⏳ Queued'}
                    {status === 'success' && '✅ Uploaded'}
                    {status === 'error' && '❌ Failed'}
                    {status === undefined && `${Math.round(progress)}%`}
                  </span>
                </div>
                {status === undefined && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

