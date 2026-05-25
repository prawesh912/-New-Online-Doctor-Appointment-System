-- Alter pricing table to add constraints
ALTER TABLE pricing ADD UNIQUE KEY unique_clinic (clinic_id);
ALTER TABLE pricing ADD CONSTRAINT pricing_ibfk_1 FOREIGN KEY (clinic_id) REFERENCES clinics (id) ON DELETE CASCADE;
