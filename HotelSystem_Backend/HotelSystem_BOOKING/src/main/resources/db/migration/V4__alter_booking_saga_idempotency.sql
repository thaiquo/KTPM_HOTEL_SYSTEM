ALTER TABLE IF EXISTS booking_saga
  ADD COLUMN IF NOT EXISTS event_key VARCHAR(150);

ALTER TABLE IF EXISTS booking_saga
  ADD COLUMN IF NOT EXISTS last_error VARCHAR(1000);

CREATE UNIQUE INDEX IF NOT EXISTS ux_booking_saga_type_event_key
  ON booking_saga(saga_type, event_key)
  WHERE event_key IS NOT NULL;
