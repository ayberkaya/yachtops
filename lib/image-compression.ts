/**
 * Image Compression Utility
 * Compresses images before upload to reduce file size and improve performance
 */

// Dynamic import to avoid SSR issues
let imageCompression: any = null;

async function getImageCompression() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!imageCompression) {
    try {
      imageCompression = (await import('browser-image-compression')).default;
    } catch (error) {
      console.warn('browser-image-compression not available:', error);
      return null;
    }
  }
  
  return imageCompression;
}

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
  initialQuality?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.85,
};

/**
 * Compress image before upload
 * Falls back to original file if compression fails or library not available
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // Only compress image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip compression for very small files (< 100KB)
  if (file.size < 100 * 1024) {
    return file;
  }

  // Skip compression in server-side context
  if (typeof window === 'undefined') {
    return file;
  }

  try {
    const compressionLib = await getImageCompression();
    if (!compressionLib) {
      console.warn('Image compression library not available, using original file');
      return file;
    }

    const compressionOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    const compressedFile = await compressionLib(file, compressionOptions);
    
    // Log compression stats in development
    if (process.env.NODE_ENV === 'development') {
      const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
      console.log(`Image compressed: ${file.name} - ${compressionRatio}% reduction (${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB)`);
    }

    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    return file;
  }
}

/**
 * Compress multiple images in parallel
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  return Promise.all(files.map(file => compressImage(file, options)));
}

