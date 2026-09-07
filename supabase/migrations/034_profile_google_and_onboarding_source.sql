-- 034: Fehlende Profilspalte + Onboarding-Herkunft
--
-- (1) profil/einstellungen speichert eine Google-Profil-URL, die Spalte fehlte
--     aber -> "Google-Konto speichern" lief ins Leere.
-- (2) onboarding schreibt eine visits-Zeile mit source='onboarding', der Wert
--     war aber nicht im Enum visit_source -> 22P02, Zeile wurde nie geschrieben.
-- Idempotent, mehrfach ausfuehrbar.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_profile_url text;

-- ADD VALUE ist idempotent per IF NOT EXISTS; darf nicht im selben Transaktions-
-- block verwendet werden, wird hier aber nur hinzugefuegt.
ALTER TYPE visit_source ADD VALUE IF NOT EXISTS 'onboarding';
