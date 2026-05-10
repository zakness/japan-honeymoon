-- Repurpose places.priority from a 3-tier preference badge (must-do / want-to / if-time)
-- into a tri-state status (must_go / default / archived). Each value now drives
-- distinct UI behavior: must_go is upvoted/starred, default is the working pool,
-- archived is hidden from the working set (saved for a future trip).
--
-- Migration is gentle (M2): existing must-do becomes must_go, everything else
-- (want-to, if-time) becomes default. Users archive deliberately afterward.

ALTER TABLE places DROP CONSTRAINT IF EXISTS places_priority_check;

UPDATE places
SET priority = CASE priority
  WHEN 'must-do' THEN 'must_go'
  WHEN 'want-to' THEN 'default'
  WHEN 'if-time' THEN 'default'
  ELSE 'default'
END;

ALTER TABLE places
  ALTER COLUMN priority SET DEFAULT 'default',
  ADD CONSTRAINT places_priority_check
    CHECK (priority IN ('must_go', 'default', 'archived'));
