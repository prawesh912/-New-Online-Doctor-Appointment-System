-- Migration to drop the unique_booking constraint from appointments table
-- Since doctor_id is a foreign key, we first add a normal index on doctor_id
-- to satisfy the foreign key constraint requirements before dropping the unique index.
ALTER TABLE appointments ADD KEY idx_doctor_id (doctor_id);
ALTER TABLE appointments DROP INDEX unique_booking;
