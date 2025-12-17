-- Add Supabase Storage fields to file models
-- These fields store metadata for files in Supabase Storage buckets
-- fileUrl is kept for backward compatibility with legacy base64 data

-- ExpenseReceipt: Add storage fields
ALTER TABLE expense_receipts 
ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Message: Add storage fields for images
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS image_bucket TEXT,
ADD COLUMN IF NOT EXISTS image_path TEXT,
ADD COLUMN IF NOT EXISTS image_mime_type TEXT,
ADD COLUMN IF NOT EXISTS image_size INTEGER;

-- MessageAttachment: Add storage fields
ALTER TABLE message_attachments
ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- VesselDocument: Add storage fields
ALTER TABLE vessel_documents
ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- CrewDocument: Add storage fields
ALTER TABLE crew_documents
ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Create indexes for storage lookups
CREATE INDEX IF NOT EXISTS idx_expense_receipts_storage ON expense_receipts(storage_bucket, storage_path) WHERE storage_bucket IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_image_storage ON messages(image_bucket, image_path) WHERE image_bucket IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_attachments_storage ON message_attachments(storage_bucket, storage_path) WHERE storage_bucket IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vessel_documents_storage ON vessel_documents(storage_bucket, storage_path) WHERE storage_bucket IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crew_documents_storage ON crew_documents(storage_bucket, storage_path) WHERE storage_bucket IS NOT NULL;

