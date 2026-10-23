-- Each version records the settings that produced it and, for refinements, the note that changed them.
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS settings JSONB;
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS refinement TEXT CHECK (char_length(refinement) <= 500);
