-- =====================================================
-- Matiku LMS - Math Canvas Projects Table Migration
-- =====================================================
-- Jalankan SQL ini di Supabase Dashboard > SQL Editor
-- untuk menambahkan fitur Papan Matematika
-- =====================================================

-- Tabel untuk menyimpan proyek kanvas matematika guru
CREATE TABLE IF NOT EXISTS math_canvas_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'Proyek Baru',
    description TEXT,
    canvas_data JSONB NOT NULL DEFAULT '{}',
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE math_canvas_projects ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can only manage their own projects
CREATE POLICY "Teachers can view their own math projects"
ON math_canvas_projects FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own math projects"
ON math_canvas_projects FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own math projects"
ON math_canvas_projects FOR UPDATE
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own math projects"
ON math_canvas_projects FOR DELETE
USING (auth.uid() = teacher_id);

-- =====================================================
-- Storage: Pastikan bucket 'matiku_storage' sudah ada
-- dan memiliki policy yang mengizinkan upload PDF
-- =====================================================
-- Jika belum ada policy untuk folder 'pdfs/', jalankan:

-- Allow authenticated users to upload PDFs
-- INSERT INTO storage.policies (name, bucket_id, definition)
-- VALUES ('Allow PDF uploads', 'matiku_storage', 
--   '(bucket_id = ''matiku_storage'' AND auth.role() = ''authenticated'')')
-- ON CONFLICT DO NOTHING;
