-- =========================================
-- CREATE DATABASE
-- =========================================
CREATE DATABASE IF NOT EXISTS doctor_appointment;
USE doctor_appointment;

-- =========================================
-- DROP TABLES IF EXIST (REVERSE ORDER)
-- =========================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS appointment_logs;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS pricing;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS generated_slots;
DROP TABLE IF EXISTS doctor_documents;
DROP TABLE IF EXISTS receptionist_kyc;
DROP TABLE IF EXISTS clinic_staff;
DROP TABLE IF EXISTS clinic_schedules;
DROP TABLE IF EXISTS doctor_time_slots;
DROP TABLE IF EXISTS doctor_schedules;
DROP TABLE IF EXISTS doctor_kyc;
DROP TABLE IF EXISTS document_categories;
DROP TABLE IF EXISTS clinics;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS categories;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================
-- CATEGORIES
-- =========================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- USERS
-- =========================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(25) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    gender ENUM('male', 'female', 'others') NOT NULL,
    dob_bs DATE,
    dob_ad DATE,
    province VARCHAR(25) NOT NULL,
    district VARCHAR(25) NOT NULL,
    city VARCHAR(25) NOT NULL,
    ward INT NOT NULL,
    tole VARCHAR(50),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    profile_image VARCHAR(255),
    role ENUM('patient', 'doctor', 'admin', 'receptionist') NOT NULL DEFAULT 'patient',
    category_id INT NULL,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    emailVerificationToken VARCHAR(255),
    emailVerificationExpires DATETIME,
    otp VARCHAR(6),
    otp_expiry DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- =========================================
-- CLINICS
-- =========================================
CREATE TABLE clinics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    province VARCHAR(25) NOT NULL,
    district VARCHAR(25) NOT NULL,
    city VARCHAR(25) NOT NULL,
    ward INT NOT NULL,
    tole VARCHAR(50),
    address TEXT,
    primary_phone_number VARCHAR(20),
    secondary_phone_number VARCHAR(20),
    email VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================================
-- DOCUMENT CATEGORIES
-- =========================================
CREATE TABLE document_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    min_files INT DEFAULT 1,
    max_files INT DEFAULT 5,
    requires_metadata BOOLEAN DEFAULT FALSE,
    is_required BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- DOCTOR KYC
-- =========================================
CREATE TABLE doctor_kyc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    category_id INT NOT NULL,
    nmc_registration_number VARCHAR(50) UNIQUE,
    nmc_registration_date DATE,
    council_name VARCHAR(150) DEFAULT 'Nepal Medical Council',
    years_experience INT DEFAULT 0,
    status ENUM('draft','pending','under_review','verified','rejected') DEFAULT 'draft',
    is_submitted BOOLEAN DEFAULT FALSE,
    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (verified_by) REFERENCES users(id),

    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_category (category_id)
);

-- =========================================
-- DOCTOR DOCUMENTS
-- =========================================
CREATE TABLE doctor_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_kyc_id INT NOT NULL,
    document_category_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (doctor_kyc_id) REFERENCES doctor_kyc(id) ON DELETE CASCADE,
    FOREIGN KEY (document_category_id) REFERENCES document_categories(id) ON DELETE CASCADE,

    INDEX idx_kyc (doctor_kyc_id),
    INDEX idx_category (document_category_id)
);

-- =========================================
-- DOCTOR SCHEDULES
-- =========================================
CREATE TABLE doctor_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day_of_week ENUM('sun','mon','tue','wed','thu','fri','sat') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_doctor_day (doctor_id, day_of_week)
);

-- =========================================
-- DOCTOR TIME SLOTS
-- =========================================
CREATE TABLE doctor_time_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    clinic_id INT NOT NULL,
    day_of_week ENUM('sun','mon','tue','wed','thu','fri','sat') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

-- =========================================
-- CLINIC SCHEDULES
-- =========================================
CREATE TABLE clinic_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinic_id INT NOT NULL,
    day_of_week ENUM(
        'sunday', 'monday', 'tuesday', 'wednesday',
        'thursday', 'friday', 'saturday'
    ) NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    open_time TIME NULL,
    close_time TIME NULL,
    break_start TIME NULL,
    break_end TIME NULL,

    UNIQUE KEY unique_day (clinic_id, day_of_week),

    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

-- =========================================
-- CLINIC STAFF
-- =========================================
CREATE TABLE clinic_staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinic_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('receptionist') DEFAULT 'receptionist',
    status ENUM('pending','active','rejected') DEFAULT 'pending',
    hired_at TIMESTAMP NULL,
    reason TEXT,

    UNIQUE KEY unique_staff (clinic_id, user_id),

    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================================
-- GENERATED SLOTS
-- =========================================
CREATE TABLE generated_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    clinic_id INT NOT NULL,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('available','booked','blocked') DEFAULT 'available',
    appointment_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(id),

    UNIQUE KEY unique_slot (doctor_id, slot_date, start_time)
);

-- =========================================
-- APPOINTMENTS
-- =========================================
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinic_id INT NOT NULL,
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    receptionist_id INT NULL,
    slot_id INT,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    reason TEXT,

    status ENUM(
        'pending',
        'confirmed',
        'rejected',
        'rescheduled',
        'completed',
        'cancelled'
    ) DEFAULT 'pending',

    created_by ENUM('patient','receptionist') DEFAULT 'patient',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (patient_id) REFERENCES users(id),
    FOREIGN KEY (receptionist_id) REFERENCES users(id),
    FOREIGN KEY (slot_id) REFERENCES generated_slots(id),

    UNIQUE KEY unique_booking (doctor_id, appointment_date, appointment_time)
);

-- Add circular foreign key after appointments table creation
ALTER TABLE generated_slots
ADD CONSTRAINT fk_generated_slot_appointment
FOREIGN KEY (appointment_id) REFERENCES appointments(id)
ON DELETE SET NULL;

-- =========================================
-- APPOINTMENT LOGS
-- =========================================
CREATE TABLE appointment_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    changed_by INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- =========================================
-- PAYMENTS
-- =========================================
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    to_user_id INT NOT NULL,
    from_user_id INT NOT NULL,
    transactionId VARCHAR(255) UNIQUE,
    pidx VARCHAR(255) UNIQUE,
    amount DECIMAL(13,4) NOT NULL CHECK (amount >= 0),
    transaction_type ENUM('credit', 'debit') NOT NULL,
    remarks VARCHAR(255) NOT NULL,
    date_from_verification_req JSON,
    api_query_from_user JSON,
    payment_gateway ENUM('khalti', 'esewa') NOT NULL,
    status ENUM('pending', 'completed', 'refunded') DEFAULT 'pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (to_user_id) REFERENCES users(id),
    FOREIGN KEY (from_user_id) REFERENCES users(id),

    INDEX idx_to_user (to_user_id),
    INDEX idx_from_user (from_user_id)
);

-- =========================================
-- PRICING
-- =========================================
CREATE TABLE pricing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinic_id INT NOT NULL,
    price DECIMAL(13,4) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

-- =========================================
-- RECEPTIONIST KYC
-- =========================================
CREATE TABLE receptionist_kyc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    citizenship_number VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL,
    issue_district VARCHAR(50) NOT NULL,
    citizenship_image VARCHAR(255) NOT NULL,
    status ENUM('pending','verified','rejected') DEFAULT 'pending',
    reason TEXT,
    rejected_date DATE,
    verified_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- =========================================
-- DATABASE SETUP COMPLETE
-- =========================================