-- Add payment_mode to appointments (Prepayment | Pay Later)
ALTER TABLE appointments
  ADD COLUMN payment_mode ENUM('Prepayment', 'Pay Later') NOT NULL DEFAULT 'Pay Later' AFTER payment_status;
