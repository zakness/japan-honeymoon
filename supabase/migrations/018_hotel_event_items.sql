-- ============================================================
-- Hotel events: check-in / check-out as first-class itinerary items
-- ============================================================
--
-- Adds policy times to accommodations (kept separate from planned times),
-- introduces a third item discriminator on itinerary_items
-- (accommodation_id + hotel_event_role), and uses triggers to keep one
-- check-in + one check-out item materialized per stay.
--
-- Layout (time_slot, sort_order) is derived once at trigger insert time,
-- then fully user-controlled. Date sync follows accommodation date edits;
-- slot/sort never auto-recompute after creation.

-- ------------------------------------------------------------
-- accommodations: add policy time columns, copy existing values
-- into them (existing times most likely come from booking
-- confirmations = policy), null out the source so the existing
-- check_in_time / check_out_time can be reused for "planned".
-- ------------------------------------------------------------
ALTER TABLE accommodations
  ADD COLUMN check_in_policy_time  TIME,
  ADD COLUMN check_out_policy_time TIME;

UPDATE accommodations
SET check_in_policy_time  = check_in_time,
    check_out_policy_time = check_out_time;

UPDATE accommodations
SET check_in_time  = NULL,
    check_out_time = NULL;

-- ------------------------------------------------------------
-- itinerary_items: add accommodation_id + hotel_event_role
-- discriminator. Mirror the existing place_id ON DELETE pattern
-- with CASCADE so a stay deletion takes its check-in/out with it.
-- ------------------------------------------------------------
ALTER TABLE itinerary_items
  ADD COLUMN accommodation_id  UUID REFERENCES accommodations (id) ON DELETE CASCADE,
  ADD COLUMN hotel_event_role  TEXT;

-- Replace the content discriminator: exactly one of
-- (place_id, text_note, accommodation_id) is set per row.
ALTER TABLE itinerary_items DROP CONSTRAINT itinerary_items_content_check;
ALTER TABLE itinerary_items ADD CONSTRAINT itinerary_items_content_check
  CHECK (
    (CASE WHEN place_id         IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN text_note        IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN accommodation_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  );

-- hotel_event_role is set iff this row is a hotel event.
ALTER TABLE itinerary_items ADD CONSTRAINT itinerary_items_hotel_event_role_check
  CHECK (
    (accommodation_id IS NULL AND hotel_event_role IS NULL) OR
    (accommodation_id IS NOT NULL AND hotel_event_role IN ('checkin', 'checkout'))
  );

-- One check-in and one check-out per accommodation (no duplicates).
CREATE UNIQUE INDEX itinerary_items_hotel_event_unique_idx
  ON itinerary_items (accommodation_id, hotel_event_role)
  WHERE accommodation_id IS NOT NULL;

CREATE INDEX itinerary_items_accommodation_id_idx
  ON itinerary_items (accommodation_id);

-- ------------------------------------------------------------
-- derive_hotel_slot(planned, policy, default_slot)
-- Replicates src/types/itinerary.ts deriveTimeSlot() semantics:
--   <8       → wake-up
--   <10      → breakfast
--   <11:30   → morning
--   <14      → lunch
--   <17      → afternoon
--   <20:30   → dinner
--   else     → evening
-- Falls back to default_slot when both inputs are NULL.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION derive_hotel_slot(planned TIME, policy TIME, default_slot TEXT)
RETURNS TEXT AS $$
DECLARE
  t TIME := COALESCE(planned, policy);
BEGIN
  IF t IS NULL THEN
    RETURN default_slot;
  END IF;

  IF t <  TIME '08:00' THEN RETURN 'wake-up';   END IF;
  IF t <  TIME '10:00' THEN RETURN 'breakfast'; END IF;
  IF t <  TIME '11:30' THEN RETURN 'morning';   END IF;
  IF t <  TIME '14:00' THEN RETURN 'lunch';     END IF;
  IF t <  TIME '17:00' THEN RETURN 'afternoon'; END IF;
  IF t <  TIME '20:30' THEN RETURN 'dinner';    END IF;
  RETURN 'evening';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ------------------------------------------------------------
-- AFTER INSERT trigger: materialize check-in + check-out items.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION accommodations_create_event_items()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO itinerary_items (day_date, time_slot, sort_order, accommodation_id, hotel_event_role, is_decided)
  VALUES
    (
      NEW.check_in_date,
      derive_hotel_slot(NEW.check_in_time, NEW.check_in_policy_time, 'evening'),
      0,
      NEW.id,
      'checkin',
      true
    ),
    (
      NEW.check_out_date,
      derive_hotel_slot(NEW.check_out_time, NEW.check_out_policy_time, 'morning'),
      0,
      NEW.id,
      'checkout',
      true
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accommodations_create_event_items_trigger
  AFTER INSERT ON accommodations
  FOR EACH ROW EXECUTE FUNCTION accommodations_create_event_items();

-- ------------------------------------------------------------
-- AFTER UPDATE trigger: keep the items' day_date in sync with
-- the stay's dates. Slot + sort_order are NEVER touched here —
-- user layout choices win after first placement.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION accommodations_sync_event_item_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_in_date IS DISTINCT FROM OLD.check_in_date THEN
    UPDATE itinerary_items
      SET day_date = NEW.check_in_date
      WHERE accommodation_id = NEW.id
        AND hotel_event_role = 'checkin';
  END IF;

  IF NEW.check_out_date IS DISTINCT FROM OLD.check_out_date THEN
    UPDATE itinerary_items
      SET day_date = NEW.check_out_date
      WHERE accommodation_id = NEW.id
        AND hotel_event_role = 'checkout';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accommodations_sync_event_item_dates_trigger
  AFTER UPDATE ON accommodations
  FOR EACH ROW EXECUTE FUNCTION accommodations_sync_event_item_dates();

-- ------------------------------------------------------------
-- Backfill: create check-in and check-out items for every
-- existing accommodation. is_decided=true mirrors trigger output.
-- ------------------------------------------------------------
INSERT INTO itinerary_items (day_date, time_slot, sort_order, accommodation_id, hotel_event_role, is_decided)
SELECT
  a.check_in_date,
  derive_hotel_slot(a.check_in_time, a.check_in_policy_time, 'evening'),
  0,
  a.id,
  'checkin',
  true
FROM accommodations a;

INSERT INTO itinerary_items (day_date, time_slot, sort_order, accommodation_id, hotel_event_role, is_decided)
SELECT
  a.check_out_date,
  derive_hotel_slot(a.check_out_time, a.check_out_policy_time, 'morning'),
  0,
  a.id,
  'checkout',
  true
FROM accommodations a;
