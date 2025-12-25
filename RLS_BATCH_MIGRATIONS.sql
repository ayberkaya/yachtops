-- ============================================================================
-- RLS Migration'ları Batch Halinde Uygulama
-- ============================================================================
-- Direct connection kullanarak bu dosyayı Supabase SQL Editor'de çalıştırın
-- Her batch'i ayrı ayrı çalıştırabilir veya hepsini birden çalıştırabilirsiniz
-- ============================================================================

-- ============================================================================
-- BATCH 1: Core Tables (2 tablo)
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yachts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BATCH 2: Business Tables Part 1 (8 tablo)
-- ============================================================================
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marina_permission_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessel_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BATCH 3: Business Tables Part 2 (10 tablo)
-- ============================================================================
ALTER TABLE public.message_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alcohol_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BATCH 4: Related Tables (10 tablo)
-- ============================================================================
ALTER TABLE public.trip_itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_tank_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_movement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alcohol_stock_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BATCH 5: Messages & User Tables (8 tablo)
-- ============================================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_note_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TAMAMLANDI!
-- ============================================================================
-- Şimdi policies migration'larını uygulayın:
-- 1. 20250115000003_rls_users_yachts_policies
-- 2. 20250115000004_rls_business_tables_policies
-- 3. 20250115000005_rls_related_tables_trips
-- 4. 20250115000006_rls_related_tables_other
-- 5. 20250115000007_rls_related_tables_messages
-- 6. 20250115000008_rls_user_specific_tables
-- 7. 20250115000009_rls_sensitive_tables
-- ============================================================================








