/**
 * Offline File Storage
 * Stores files in IndexedDB for offline upload
 */

import { offlineStorage } from './offline-storage';

export interface OfflineFile {
  id: string;
  file: ArrayBuffer;
  fileName: string;
  mimeType: string;
  size: number;
  expenseId?: string;
  taskId?: string;
  messageId?: string;
  timestamp: number;
}

/**
 * Store file in IndexedDB for offline upload
 */
export async function storeFileOffline(
  file: File,
  metadata: {
    expenseId?: string;
    taskId?: string;
    messageId?: string;
  }
): Promise<string> {
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const arrayBuffer = await file.arrayBuffer();

  const offlineFile: OfflineFile = {
    id: fileId,
    file: arrayBuffer,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    ...metadata,
    timestamp: Date.now(),
  };

  await offlineStorage.set(`offline_file:${fileId}`, offlineFile);
  return fileId;
}

/**
 * Retrieve file from IndexedDB
 */
export async function getOfflineFile(fileId: string): Promise<OfflineFile | null> {
  return await offlineStorage.get<OfflineFile>(`offline_file:${fileId}`);
}

/**
 * Convert ArrayBuffer back to File
 */
export function arrayBufferToFile(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  mimeType: string
): File {
  const blob = new Blob([arrayBuffer], { type: mimeType });
  return new File([blob], fileName, { type: mimeType });
}

/**
 * Get all pending file uploads
 */
export async function getPendingFileUploads(): Promise<OfflineFile[]> {
  const keys = await offlineStorage.keys();
  const fileKeys = keys.filter(key => key.startsWith('offline_file:'));
  
  const files: OfflineFile[] = [];
  for (const key of fileKeys) {
    const file = await offlineStorage.get<OfflineFile>(key);
    if (file) {
      files.push(file);
    }
  }
  
  return files.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Delete offline file after successful upload
 */
export async function deleteOfflineFile(fileId: string): Promise<void> {
  await offlineStorage.delete(`offline_file:${fileId}`);
}

