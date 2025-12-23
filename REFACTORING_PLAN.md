# Refactoring Plan: Security & Offline-First Implementation

**Priority:** CRITICAL  
**Timeline:** 3-4 weeks  
**Status:** Ready to Execute

---

## Phase 1: Critical Security Fixes (Week 1)

### 1.1 Prisma Middleware for Tenant Enforcement

**File:** `helmops/lib/db.ts`

Add this middleware immediately to provide defense-in-depth:

```typescript
import { Prisma } from '@prisma/client';
import { getSession } from './get-session';
import { getTenantId, isPlatformAdmin } from './tenant';

// Add after Prisma client creation
db.$use(async (params, next) => {
  // Models that require tenant scoping
  const tenantScopedModels = [
    'expense', 'task', 'trip', 'shoppingList', 'messageChannel',
    'alcoholStock', 'maintenanceLog', 'cashTransaction', 'crewDocument',
    'vesselDocument', 'marinaPermissionDocument', 'shift', 'leave',
    'customRole', 'product', 'shoppingStore', 'expenseCategory', 'creditCard',
    'tripItineraryDay', 'tripChecklistItem', 'tripTankLog', 'tripMovementLog',
    'taskComment', 'taskAttachment', 'expenseReceipt', 'maintenanceDocument',
    'shoppingItem', 'alcoholStockHistory', 'message', 'messageRead',
    'messageAttachment'
  ];

  if (tenantScopedModels.includes(params.model || '')) {
    try {
      const session = await getSession();
      const isAdmin = isPlatformAdmin(session);
      const tenantId = getTenantId(session);

      // Skip enforcement for admin users (they can access all data)
      if (isAdmin) {
        return next(params);
      }

      // Enforce tenant scope for regular users
      if (!tenantId) {
        throw new Error('Tenant ID required for data access. User must be assigned to a yacht.');
      }

      // Apply tenant filter based on operation type
      if (['findMany', 'findFirst', 'count'].includes(params.action)) {
        // SELECT operations - add yachtId to where clause
        if (params.args.where) {
          // Handle nested yachtId (for related tables)
          if (params.model === 'expenseReceipt') {
            // For expense receipts, filter via expense.yachtId
            params.args.where.expense = {
              ...(params.args.where.expense || {}),
              yachtId: tenantId,
            };
          } else if (params.model === 'taskComment' || params.model === 'taskAttachment') {
            // For task comments/attachments, filter via task.yachtId
            params.args.where.task = {
              ...(params.args.where.task || {}),
              yachtId: tenantId,
            };
          } else {
            // Direct yachtId filter for most tables
            params.args.where.yachtId = tenantId;
          }
        } else {
          params.args.where = { yachtId: tenantId };
        }
      } else if (params.action === 'create') {
        // INSERT operations - ensure yachtId is set
        if (!params.args.data.yachtId) {
          params.args.data.yachtId = tenantId;
        }
      } else if (['update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)) {
        // UPDATE/DELETE operations - add yachtId to where clause
        if (params.args.where) {
          params.args.where.yachtId = tenantId;
        } else {
          params.args.where = { yachtId: tenantId };
        }
      }
    } catch (error) {
      // If session retrieval fails, deny access
      throw new Error('Authentication required for database access');
    }
  }

  return next(params);
});
```

**Testing:**
```typescript
// Test that middleware enforces tenant scope
const session = { user: { yachtId: 'yacht-1' } };
// This should only return yacht-1 expenses
const expenses = await db.expense.findMany({});
// This should throw error
const expenses = await db.expense.findMany({ where: { yachtId: 'yacht-2' } });
```

---

### 1.2 Hybrid Auth Approach (Supabase Auth + NextAuth)

**Goal:** Enable RLS policies while keeping NextAuth for UI.

#### Step 1: Create Supabase Auth User Sync Function

**File:** `helmops/lib/supabase-auth-sync.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { db } from './db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Sync NextAuth user to Supabase Auth
 * Call this after user creation/login
 */
export async function syncUserToSupabaseAuth(
  userId: string,
  email: string,
  passwordHash?: string
): Promise<void> {
  try {
    // Check if user already exists in Supabase Auth
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (existingUser?.user) {
      // User exists, update if needed
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true, // Auto-confirm email
      });
    } else {
      // Create new user in Supabase Auth
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        id: userId, // Use same ID as NextAuth
        email,
        email_confirm: true,
        password: passwordHash ? undefined : generateRandomPassword(), // Set random password if no hash
      });

      if (error) {
        console.error('Failed to sync user to Supabase Auth:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error syncing user to Supabase Auth:', error);
    // Don't throw - allow app to continue even if sync fails
    // RLS will still work via service role for now
  }
}

function generateRandomPassword(): string {
  return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
}

/**
 * Get Supabase JWT token for a user
 * Use this for database queries that need RLS enforcement
 */
export async function getSupabaseJWT(userId: string): Promise<string | null> {
  try {
    // Impersonate user to get their JWT token
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: '', // Not needed for impersonation
    });

    // Alternative: Create a custom JWT token
    // This requires Supabase JWT secret
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      console.warn('SUPABASE_JWT_SECRET not set, cannot generate JWT');
      return null;
    }

    // Generate JWT token (simplified - use proper JWT library)
    // In production, use a proper JWT library like 'jsonwebtoken'
    return null; // Placeholder
  } catch (error) {
    console.error('Failed to get Supabase JWT:', error);
    return null;
  }
}
```

#### Step 2: Update Auth Routes

**File:** `helmops/app/api/auth/signup/route.ts`

Add user sync after user creation:

```typescript
import { syncUserToSupabaseAuth } from '@/lib/supabase-auth-sync';

// After creating user in database
const user = await db.user.create({ ... });

// Sync to Supabase Auth
await syncUserToSupabaseAuth(user.id, user.email, user.passwordHash);
```

#### Step 3: Update RLS Helper Function

**File:** Create migration to update RLS helper function

```sql
-- Update get_user_yacht_id() to work with NextAuth user IDs
CREATE OR REPLACE FUNCTION get_user_yacht_id()
RETURNS TEXT AS $$
DECLARE
  current_user_id TEXT;
  user_yacht_id TEXT;
BEGIN
  -- Try to get user ID from Supabase Auth first
  current_user_id := auth.uid()::TEXT;
  
  -- If no Supabase Auth user, try to get from JWT claim
  IF current_user_id IS NULL THEN
    current_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
  END IF;
  
  -- If still no user ID, return NULL (will deny access)
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get yacht_id from users table
  SELECT yacht_id INTO user_yacht_id
  FROM public.users
  WHERE id = current_user_id;
  
  RETURN user_yacht_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 1.3 ESLint Rule for Unsafe Database Access

**File:** `helmops/eslint.config.mjs`

Add custom rule:

```javascript
export default [
  {
    rules: {
      // Custom rule to detect unsafe database access
      'no-unsafe-db-access': {
        meta: {
          type: 'problem',
          docs: {
            description: 'Disallow direct db.* calls without tenant scope',
          },
        },
        create(context) {
          return {
            CallExpression(node) {
              if (
                node.callee.type === 'MemberExpression' &&
                node.callee.object.name === 'db' &&
                ['findMany', 'findFirst', 'create', 'update', 'delete'].includes(
                  node.callee.property.name
                )
              ) {
                // Check if withTenantScope is used in the same scope
                const sourceCode = context.getSourceCode();
                const text = sourceCode.getText(node);
                
                // Simple check - look for withTenantScope in parent scopes
                let parent = node.parent;
                let foundTenantScope = false;
                
                while (parent) {
                  const parentText = sourceCode.getText(parent);
                  if (parentText.includes('withTenantScope')) {
                    foundTenantScope = true;
                    break;
                  }
                  parent = parent.parent;
                }
                
                if (!foundTenantScope) {
                  context.report({
                    node,
                    message: 'Database query must use withTenantScope() for tenant isolation',
                  });
                }
              }
            },
          };
        },
      },
    },
  },
];
```

---

## Phase 2: Offline File Uploads (Week 2)

### 2.1 Offline File Storage

**File:** `helmops/lib/offline-file-storage.ts`

```typescript
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
```

### 2.2 Update Offline Queue for File Uploads

**File:** `helmops/lib/offline-queue.ts`

Add file upload support:

```typescript
import { getOfflineFile, arrayBufferToFile, deleteOfflineFile } from './offline-file-storage';

// Add to OfflineQueue class
async enqueueFileUpload(
  fileId: string,
  url: string,
  method: string = 'POST',
  metadata?: Record<string, any>
): Promise<string> {
  const queueId = await offlineStorage.addToQueue(url, method, {}, {
    fileId,
    ...metadata,
  });
  
  this.notifySyncListeners();
  
  // Try to sync immediately if online
  if (this.isOnline && !this.isSyncing) {
    this.sync().catch(console.error);
  }
  
  return queueId;
}

// Update sync method to handle file uploads
private async processQueueItem(item: QueueItem): Promise<void> {
  try {
    // Check if this is a file upload
    const body = item.body ? JSON.parse(item.body) : null;
    if (body?.fileId) {
      // Retrieve file from IndexedDB
      const offlineFile = await getOfflineFile(body.fileId);
      if (!offlineFile) {
        throw new Error(`Offline file not found: ${body.fileId}`);
      }

      // Convert ArrayBuffer to File
      const file = arrayBufferToFile(
        offlineFile.file,
        offlineFile.fileName,
        offlineFile.mimeType
      );

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata fields
      if (offlineFile.expenseId) {
        formData.append('expenseId', offlineFile.expenseId);
      }
      if (offlineFile.taskId) {
        formData.append('taskId', offlineFile.taskId);
      }
      if (offlineFile.messageId) {
        formData.append('messageId', offlineFile.messageId);
      }

      // Upload file
      const response = await fetch(item.url, {
        method: item.method,
        headers: {
          // Don't set Content-Type - browser will set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Delete offline file after successful upload
      await deleteOfflineFile(body.fileId);
    } else {
      // Regular request handling (existing code)
      // ... existing sync logic
    }
  } catch (error) {
    // Handle error (existing code)
    throw error;
  }
}
```

### 2.3 Update Expense Form

**File:** `helmops/components/expenses/expense-form.tsx`

Update receipt upload logic:

```typescript
import { storeFileOffline } from '@/lib/offline-file-storage';
import { offlineQueue } from '@/lib/offline-queue';

// In performSave function, after expense creation:
if (receiptFiles.length > 0 && result?.id) {
  if (offlineQueue.online && !response.queued) {
    // Online - upload immediately
    try {
      for (const file of receiptFiles) {
        const receiptFormData = new FormData();
        receiptFormData.append('file', file);
        const receiptResponse = await fetch(`/api/expenses/${result.id}/receipt`, {
          method: 'POST',
          body: receiptFormData,
        });
        if (!receiptResponse.ok) {
          throw new Error('Receipt upload failed');
        }
      }
    } catch (uploadError) {
      console.error('Failed to upload receipt images', uploadError);
      // Fallback to offline storage
      for (const file of receiptFiles) {
        await storeFileOffline(file, { expenseId: result.id });
        await offlineQueue.enqueueFileUpload(
          await storeFileOffline(file, { expenseId: result.id }),
          `/api/expenses/${result.id}/receipt`,
          'POST'
        );
      }
    }
  } else {
    // Offline or queued - store files and queue uploads
    for (const file of receiptFiles) {
      const fileId = await storeFileOffline(file, { expenseId: result.id });
      await offlineQueue.enqueueFileUpload(
        fileId,
        `/api/expenses/${result.id}/receipt`,
        'POST'
      );
    }
  }
}
```

---

## Phase 3: Image Compression (Week 2-3)

### 3.1 Install Compression Library

```bash
npm install browser-image-compression
npm install --save-dev @types/browser-image-compression
```

### 3.2 Create Compression Utility

**File:** `helmops/lib/image-compression.ts`

```typescript
import imageCompression from 'browser-image-compression';

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
 * Falls back to original file if compression fails
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

  try {
    const compressionOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    const compressedFile = await imageCompression(file, compressionOptions);
    
    // Log compression stats
    const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
    console.log(`Image compressed: ${file.name} - ${compressionRatio}% reduction`);

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
```

### 3.3 Update Upload Components

**File:** `helmops/components/expenses/expense-form.tsx`

```typescript
import { compressImages } from '@/lib/image-compression';

// Before uploading receipts:
const compressedReceipts = await compressImages(receiptFiles);
// Use compressedReceipts instead of receiptFiles
```

**File:** `helmops/components/messages/message-form.tsx`

```typescript
import { compressImage } from '@/lib/image-compression';

// Before uploading message image:
if (imageFile) {
  const compressedImage = await compressImage(imageFile);
  // Use compressedImage instead of imageFile
}
```

---

## Phase 4: Complete Offline Migration (Week 3-4)

### 4.1 Migrate Task Form

**File:** `helmops/components/tasks/task-form.tsx`

Replace direct `fetch()` calls with `apiClient`:

```typescript
import { apiClient } from '@/lib/api-client';

// Replace:
const response = await fetch('/api/tasks', { ... });

// With:
const response = await apiClient.request('/api/tasks', {
  method: 'POST',
  body: JSON.stringify(taskData),
  queueOnOffline: true,
});
```

### 4.2 Add Optimistic Updates

**File:** `helmops/hooks/use-optimistic-mutations.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useOptimisticMutation<TData, TVariables>({
  queryKey,
  mutationFn,
  onMutate,
  onError,
  onSettled,
}: {
  queryKey: string[];
  mutationFn: (variables: TVariables) => Promise<TData>;
  onMutate?: (variables: TVariables) => Promise<any>;
  onError?: (error: Error, variables: TVariables, context: any) => void;
  onSettled?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previous = queryClient.getQueryData(queryKey);

      // Optimistically update
      if (onMutate) {
        await onMutate(variables);
      }

      return { previous };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      if (onError) {
        onError(error, variables, context);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey });
      if (onSettled) {
        onSettled();
      }
    },
  });
}
```

---

## Testing Checklist

### Security Tests

```typescript
// test/security/tenant-isolation.test.ts
describe('Tenant Isolation', () => {
  it('should prevent cross-tenant data access', async () => {
    const userA = await createTestUser({ yachtId: 'yacht-1' });
    const userB = await createTestUser({ yachtId: 'yacht-2' });
    
    // Create expense as user A
    const expense = await createExpenseAsUser(userA, { yachtId: 'yacht-1' });
    
    // Try to access as user B
    const session = await getSessionForUser(userB);
    const result = await db.expense.findFirst({
      where: { id: expense.id },
    });
    
    expect(result).toBeNull(); // Should not find expense
  });

  it('should enforce yachtId on create', async () => {
    const user = await createTestUser({ yachtId: 'yacht-1' });
    const session = await getSessionForUser(user);
    
    // Try to create expense without yachtId
    await expect(
      db.expense.create({
        data: {
          description: 'Test',
          amount: 100,
          // yachtId missing
        },
      })
    ).rejects.toThrow();
  });
});
```

### Offline Tests

```typescript
// test/offline/file-upload.test.ts
describe('Offline File Upload', () => {
  it('should store files offline when network is down', async () => {
    // Simulate offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileId = await storeFileOffline(file, { expenseId: 'exp-1' });
    
    expect(fileId).toBeDefined();
    
    const storedFile = await getOfflineFile(fileId);
    expect(storedFile).toBeDefined();
    expect(storedFile?.expenseId).toBe('exp-1');
  });

  it('should sync files when network is restored', async () => {
    // Store file offline
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileId = await storeFileOffline(file, { expenseId: 'exp-1' });
    await offlineQueue.enqueueFileUpload(fileId, '/api/expenses/exp-1/receipt');
    
    // Simulate online
    Object.defineProperty(navigator, 'onLine', { value: true });
    await offlineQueue.sync();
    
    // Verify file was uploaded and deleted from offline storage
    const storedFile = await getOfflineFile(fileId);
    expect(storedFile).toBeNull();
  });
});
```

---

## Migration Order

1. **Day 1-2:** Add Prisma middleware (Phase 1.1)
2. **Day 3-4:** Implement offline file storage (Phase 2.1-2.2)
3. **Day 5-7:** Add image compression (Phase 3)
4. **Week 2:** Complete offline migration (Phase 4)
5. **Week 3:** Hybrid auth approach (Phase 1.2)
6. **Week 4:** Testing and bug fixes

---

## Rollback Plan

If issues arise:

1. **Prisma Middleware:** Comment out middleware in `lib/db.ts`
2. **Offline File Storage:** Disable in feature flags
3. **Image Compression:** Add feature flag to skip compression
4. **Auth Sync:** Disable sync function calls

All changes are additive and can be disabled without breaking existing functionality.

