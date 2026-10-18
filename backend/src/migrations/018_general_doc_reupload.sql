-- 018_general_doc_reupload.sql
-- Lets an admin flag a client's uploaded General Documentation file as
-- needing to be re-sent (wrong document, unreadable scan, etc.) instead of
-- silently deleting it. The existing `status` column (default 'uploaded')
-- gains a 'reupload_requested' value; these columns record who asked, when,
-- and why, so the file stays visible to admin while the client sees the
-- slot as outstanding again.

ALTER TABLE general_doc_uploads ADD COLUMN IF NOT EXISTS reupload_requested_at TIMESTAMPTZ;
ALTER TABLE general_doc_uploads ADD COLUMN IF NOT EXISTS reupload_requested_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE general_doc_uploads ADD COLUMN IF NOT EXISTS reupload_reason TEXT;
