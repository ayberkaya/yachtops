/**
 * File Upload Security Utilities
 * 
 * Provides validation for file uploads to prevent security vulnerabilities:
 * - File size limits
 * - File type validation
 * - MIME type checking
 */

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZES = {
  // Images: 5MB
  image: 5 * 1024 * 1024,
  // Documents: 10MB
  document: 10 * 1024 * 1024,
  // General: 10MB
  general: 10 * 1024 * 1024,
} as const;

// Allowed MIME types for images
const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

// Allowed MIME types for documents
const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
] as const;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  image: ALLOWED_IMAGE_MIME_TYPES,
  document: ALLOWED_DOCUMENT_MIME_TYPES,
  general: [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_DOCUMENT_MIME_TYPES],
} as const;

// Allowed file extensions
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"] as const;
const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv"] as const;

export const ALLOWED_EXTENSIONS = {
  image: ALLOWED_IMAGE_EXTENSIONS,
  document: ALLOWED_DOCUMENT_EXTENSIONS,
  general: [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_DOCUMENT_EXTENSIONS],
} as const;

export type FileCategory = "image" | "document" | "general";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileSize(
  file: File,
  category: FileCategory = "general"
): FileValidationResult {
  const maxSize = MAX_FILE_SIZES[category];
  
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }
  
  if (file.size === 0) {
    return {
      valid: false,
      error: "File is empty",
    };
  }
  
  return { valid: true };
}

export function validateMimeType(
  file: File,
  category: FileCategory = "general"
): FileValidationResult {
  const allowedTypes = ALLOWED_MIME_TYPES[category] as readonly string[];
  const fileType = file.type.toLowerCase();
  
  if (!fileType || fileType === "application/octet-stream") {
    const extension = getFileExtension(file.name);
    if (extension) {
      const allowedExtensions = ALLOWED_EXTENSIONS[category] as readonly string[];
      if (!allowedExtensions.includes(extension.toLowerCase())) {
        return {
          valid: false,
          error: `File type not allowed. Allowed types: ${allowedExtensions.join(", ")}`,
        };
      }
    } else {
      return {
        valid: false,
        error: "Unable to determine file type",
      };
    }
  } else {
    if (!allowedTypes.includes(fileType)) {
      return {
        valid: false,
        error: `File type "${fileType}" not allowed. Allowed types: ${allowedTypes.join(", ")}`,
      };
    }
  }
  
  return { valid: true };
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return "";
  }
  return filename.substring(lastDot).toLowerCase();
}

export function validateFileName(filename: string): FileValidationResult {
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return {
      valid: false,
      error: "Invalid file name: path traversal detected",
    };
  }
  
  if (filename.includes("\0")) {
    return {
      valid: false,
      error: "Invalid file name: null byte detected",
    };
  }
  
  if (filename.length > 255) {
    return {
      valid: false,
      error: "File name is too long (maximum 255 characters)",
    };
  }
  
  return { valid: true };
}

export function validateFileUpload(
  file: File,
  category: FileCategory = "general"
): FileValidationResult {
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.valid) {
    return nameValidation;
  }
  
  const sizeValidation = validateFileSize(file, category);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }
  
  const mimeValidation = validateMimeType(file, category);
  if (!mimeValidation.valid) {
    return mimeValidation;
  }
  
  return { valid: true };
}

export function sanitizeFileName(filename: string): string {
  let sanitized = filename.replace(/^.*[\\/]/, "");
  sanitized = sanitized.replace(/\0/g, "");
  sanitized = sanitized.replace(/[<>:"|?*]/g, "_");
  
  if (sanitized.length > 255) {
    const ext = getFileExtension(sanitized);
    const nameWithoutExt = sanitized.substring(0, 255 - ext.length);
    sanitized = nameWithoutExt + ext;
  }
  
  return sanitized || "file";
}
