-- =====================================================
-- Storage Buckets (ذخیره‌سازی فایل‌ها)
-- =====================================================
-- این SQL برای Supabase Storage است
-- این اسکریپت توسط Dashboard Supabase اجرا می‌شود

-- برای اجرا در Supabase:
-- 1. به Storage بروید
-- 2. "New bucket" کلیک کنید
-- 3. این نام‌ها را ایجاد کنید:

-- Bucket 1: project-images
-- - برای نگهداری عکس‌های کارگاه و تحلیل Vision
-- - Public: بله (برای نمایش عکس‌ها)

-- Bucket 2: project-documents
-- - برای فایل‌های پروژه (PDF، Excel، etc.)
-- - Public: خیر (برای امنیت)

-- Bucket 3: daily-reports
-- - برای تهیه‌کنندگان روزانه
-- - Public: خیر

-- Bucket 4: material-invoices
-- - برای فاکتورها و بارنامه‌ها
-- - Public: خیر
