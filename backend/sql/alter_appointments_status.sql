-- Ensure appointments.status includes 'completed'
ALTER TABLE appointments
  MODIFY COLUMN status ENUM('pending','confirmed','rejected','rescheduled','completed','cancelled') DEFAULT 'pending';
