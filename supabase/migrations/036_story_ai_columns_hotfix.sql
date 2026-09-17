-- 036: Hotfix - die KI-Spalten aus 005_ai_analysis.sql fehlten in der Live-DB
-- (Migration wurde dort nie ausgefuehrt). Jeder Story-Insert scheiterte mit
-- PGRST204 "Could not find the 'ai_verdict' column". Am 17.09.2026 direkt im
-- SQL-Editor ausgefuehrt; Datei dient als Protokoll. Idempotent.

ALTER TABLE story_submissions
  ADD COLUMN IF NOT EXISTS ai_verdict TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_confidence INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
