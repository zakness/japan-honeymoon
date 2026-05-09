ALTER TABLE itinerary_items DROP CONSTRAINT itinerary_items_time_slot_check;
ALTER TABLE itinerary_items ADD CONSTRAINT itinerary_items_time_slot_check
  CHECK (time_slot IN ('wake-up','breakfast','morning','lunch','afternoon','dinner','evening'));

ALTER TABLE transport_items DROP CONSTRAINT transport_items_time_slot_check;
ALTER TABLE transport_items ADD CONSTRAINT transport_items_time_slot_check
  CHECK (time_slot IN ('wake-up','breakfast','morning','lunch','afternoon','dinner','evening'));
