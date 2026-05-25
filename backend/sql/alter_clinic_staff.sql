-- Add applied_at for receptionist application date filtering
ALTER TABLE clinic_staff
  ADD COLUMN applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER status;
