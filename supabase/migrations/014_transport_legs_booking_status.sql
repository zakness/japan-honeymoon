ALTER TABLE transport_legs
  ADD COLUMN booking_status text NOT NULL DEFAULT 'not_booked'
    CHECK (booking_status IN ('booked', 'not_booked', 'not_needed'));

UPDATE transport_legs SET booking_status = CASE WHEN is_booked THEN 'booked' ELSE 'not_booked' END;

ALTER TABLE transport_legs DROP COLUMN is_booked;
