-- 008_task_document_slots.sql — one upload per document slot (quantity-based requirements)
ALTER TABLE task_documents
  ADD COLUMN IF NOT EXISTS slot_index INTEGER NOT NULL DEFAULT 1;

-- Replace duplicate slot uploads for same task+category+slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_documents_unique_slot
  ON task_documents(task_id, category, slot_index);
