/**
 * Form data preservation utilities
 * Preserves user-entered data in case of errors or page refreshes
 */

const STORAGE_PREFIX = "helmops_form_data_";

/**
 * Save form data to localStorage
 */
export function saveFormData(formId: string, data: Record<string, any>): void {
  if (typeof window === "undefined") return;

  try {
    const key = `${STORAGE_PREFIX}${formId}`;
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    // Ignore localStorage errors (quota exceeded, etc.)
    console.error("Failed to save form data:", error);
  }
}

/**
 * Load form data from localStorage
 */
export function loadFormData<T = Record<string, any>>(formId: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const key = `${STORAGE_PREFIX}${formId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    
    // Only return data if it's less than 24 hours old
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - parsed.timestamp > maxAge) {
      clearFormData(formId);
      return null;
    }

    return parsed.data as T;
  } catch (error) {
    console.error("Failed to load form data:", error);
    return null;
  }
}

/**
 * Clear saved form data
 */
export function clearFormData(formId: string): void {
  if (typeof window === "undefined") return;

  try {
    const key = `${STORAGE_PREFIX}${formId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear form data:", error);
  }
}

/**
 * Clear all saved form data
 */
export function clearAllFormData(): void {
  if (typeof window === "undefined") return;

  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error("Failed to clear all form data:", error);
  }
}

