-- Migration 005: AI analysis fields on story_submissions
-- Run in Supabase SQL editor

ALTER TABLE story_submissions
  ADD COLUMN IF NOT EXISTS ai_verdict TEXT DEFAULT NULL,         -- 'approved' | 'suspicious' | 'rejected' | 'pending'
  ADD COLUMN IF NOT EXISTS ai_confidence INTEGER DEFAULT NULL,   -- 0-100
  ADD COLUMN IF NOT EXISTS ai_notes TEXT DEFAULT NULL,           -- AI explanation
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN story_submissions.ai_verdict IS 'KI-Urteil: approved | suspicious | rejected | pending';
COMMENT ON COLUMN story_submissions.ai_confidence IS 'KI-Konfidenz 0-100';
COMMENT ON COLUMN story_submissions.ai_notes IS 'KI-Begründung auf Deutsch';
