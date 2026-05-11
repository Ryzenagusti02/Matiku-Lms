-- =====================================================
-- Matiku LMS - Peningkatan Ujian CBT
-- =====================================================
-- Jalankan skrip ini di Supabase SQL Editor untuk
-- mendukung tipe soal baru (PG Kompleks, Essai)
-- dan jawaban berupa teks / array angka.
-- =====================================================

-- 1. Tambahkan tipe soal pada tabel questions
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';

-- 2. Buat correct_answer_index (PG Biasa) menjadi opsional (karena Essai tidak menggunakannya)
ALTER TABLE public.questions 
ALTER COLUMN correct_answer_index DROP NOT NULL;

-- 3. Tambahkan kolom untuk jawaban PG Kompleks (Multiple Response)
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS correct_answers JSONB DEFAULT '[]'::jsonb;

-- 4. Tambahkan kolom untuk panduan penilaian/kunci jawaban guru pada soal Essai
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS essay_keywords JSONB DEFAULT '[]'::jsonb;

-- 5. Tabel exam_attempts sudah menggunakan 'answers' bertipe JSONB,
--    sehingga tidak perlu diubah, hanya frontend yang menyesuaikan
--    isinya (dari integer tunggal menjadi array/string).
