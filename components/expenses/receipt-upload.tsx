'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { compressImage } from '@/lib/image-compression';
import { storeFileOffline, getOfflineFile, deleteOfflineFile } from '@/lib/offline-file-storage';
import { offlineQueue } from '@/lib/offline-queue';
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'pending' | 'success' | 'error'>>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

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

          // Step 2: Check if online
          if (offlineQueue.online) {
            // Online - upload immediately
            setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));
            
            const formData = new FormData();
            formData.append('file', compressedFile);

            const response = await apiClient.request<{ id: string }>(
              `/api/expenses/${expenseId}/receipt`,
              {
                method: 'POST',
                body: formData,
                queueOnOffline: false, // Already checked online status
              }
            );

            setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
            setUploadStatus(prev => ({ ...prev, [fileId]: 'success' }));
            
            if (onUploadSuccess) {
              onUploadSuccess(response.data.id);
            }
          } else {
            // Offline - store and queue
            setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));
            
            const storedFileId = await storeFileOffline(compressedFile, {
              expenseId,
            });

            await offlineQueue.enqueueFileUpload(
              storedFileId,
              `/api/expenses/${expenseId}/receipt`,
              'POST'
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

