-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: May 24, 2026 at 11:38 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `doctor_appointment`
--

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `id` int(11) NOT NULL,
  `clinic_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `receptionist_id` int(11) DEFAULT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('pending','confirmed','rejected','rescheduled','completed','cancelled') DEFAULT 'pending',
  `created_by` enum('patient','receptionist') DEFAULT 'patient',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `slot_id` int(11) DEFAULT NULL,
  `token_number` varchar(30) DEFAULT NULL COMMENT 'Format: YYYYMMDD-NNN',
  `payment_status` enum('unpaid','paid','refunded','partial_refund') DEFAULT 'unpaid',
  `payment_mode` enum('Prepayment','Pay Later') NOT NULL DEFAULT 'Pay Later',
  `payment_id` int(11) DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `rescheduled_date` date DEFAULT NULL,
  `rescheduled_time` time DEFAULT NULL,
  `rescheduled_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointments`
--

INSERT INTO `appointments` (`id`, `clinic_id`, `doctor_id`, `patient_id`, `receptionist_id`, `appointment_date`, `appointment_time`, `reason`, `status`, `created_by`, `notes`, `created_at`, `slot_id`, `token_number`, `payment_status`, `payment_id`, `cancellation_reason`, `rescheduled_date`, `rescheduled_time`, `rescheduled_by`, `updated_at`) VALUES
(3, 1, 4, 2, NULL, '2026-04-20', '10:00:00', 'Fever and headache for 3 days', 'pending', 'patient', NULL, '2026-04-20 01:09:25', NULL, NULL, 'unpaid', NULL, NULL, NULL, NULL, NULL, '2026-05-24 20:29:04'),
(4, 1, 4, 19, NULL, '2026-05-26', '10:30:00', 'Chest pain and mild fever', 'cancelled', 'patient', NULL, '2026-05-24 20:54:55', NULL, '20260526-001', 'unpaid', NULL, 'Emergency travel', NULL, NULL, NULL, '2026-05-24 20:58:14'),
(8, 1, 4, 19, NULL, '2026-05-27', '14:00:00', 'Chest pain and mild fever', 'rescheduled', 'patient', NULL, '2026-05-24 21:26:26', NULL, '20260527-001', 'unpaid', NULL, 'Doctor has urgent surgery', '2026-05-27', '14:00:00', 4, '2026-05-24 21:28:24');

-- --------------------------------------------------------

--
-- Table structure for table `appointment_logs`
--

CREATE TABLE `appointment_logs` (
  `id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointment_logs`
--

INSERT INTO `appointment_logs` (`id`, `appointment_id`, `changed_by`, `old_status`, `new_status`, `comment`, `created_at`) VALUES
(4, 4, 19, 'pending', 'cancelled', 'Emergency travel', '2026-05-24 20:58:14'),
(5, 8, 4, 'pending', 'rescheduled', 'Rescheduled from 2026-05-25 10:30:00 to 2026-05-27 14:00:00. Reason: Doctor has urgent surgery', '2026-05-24 21:28:24');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `description`, `icon`, `is_active`, `created_at`) VALUES
(1, 'General Physician', 'Routine checkups, fever, minor illnesses', NULL, NULL, '2026-04-06 19:12:58'),
(2, 'Pediatrics', 'Child health and vaccinations', NULL, NULL, '2026-04-07 04:48:41'),
(3, 'Gynecology', 'Women\'s health, pregnancy care', NULL, NULL, '2026-04-07 04:49:13'),
(4, 'Orthopedics', 'Bones, joints, sports injuries', NULL, NULL, '2026-04-07 04:49:34'),
(5, 'Dermatology', 'Skin, hair, and nail issues', NULL, NULL, '2026-04-07 04:49:57');

-- --------------------------------------------------------

--
-- Table structure for table `clinics`
--

CREATE TABLE `clinics` (
  `id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `province` varchar(25) NOT NULL,
  `district` varchar(25) NOT NULL,
  `city` varchar(25) NOT NULL,
  `ward` int(11) NOT NULL,
  `tole` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `primary_phone_number` varchar(20) DEFAULT NULL,
  `secondary_phone_number` varchar(20) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clinics`
--

INSERT INTO `clinics` (`id`, `doctor_id`, `name`, `description`, `province`, `district`, `city`, `ward`, `tole`, `address`, `primary_phone_number`, `secondary_phone_number`, `email`, `is_active`, `created_at`) VALUES
(1, 4, 'Bagmati Care Clinic', 'General health services', 'Bagmati', 'Kathmandu', 'Kathmandu', 5, 'Baneshwor', 'Near XYZ Chowk', '9800000000', '9811111111', 'bagmaticlinic@example.com', 1, '2026-04-19 22:39:05'),
(2, 4, 'City Care Clinic', 'General health services', 'Bagmati', 'Kathmandu', 'Kathmandu', 5, 'Baneshwor', 'Near XYZ Chowk', '9800000000', '9811111111', 'clinic@example.com', 1, '2026-05-24 20:23:01');

-- --------------------------------------------------------

--
-- Table structure for table `clinic_doctors`
--

CREATE TABLE `clinic_doctors` (
  `id` int(11) NOT NULL,
  `clinic_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clinic_doctors`
--

INSERT INTO `clinic_doctors` (`id`, `clinic_id`, `doctor_id`, `is_active`, `joined_at`) VALUES
(1, 2, 12, 1, '2026-05-24 20:42:41');

-- --------------------------------------------------------

--
-- Table structure for table `clinic_holidays`
--

CREATE TABLE `clinic_holidays` (
  `id` int(11) NOT NULL,
  `clinic_id` int(11) NOT NULL,
  `holiday_date` date NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clinic_holidays`
--

INSERT INTO `clinic_holidays` (`id`, `clinic_id`, `holiday_date`, `reason`, `created_at`) VALUES
(1, 2, '2026-06-27', 'Clinic renovation', '2026-05-24 20:46:57');

-- --------------------------------------------------------

--
-- Table structure for table `clinic_reviews`
--

CREATE TABLE `clinic_reviews` (
  `id` int(11) NOT NULL,
  `clinic_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `rating` tinyint(1) NOT NULL CHECK (`rating` between 1 and 5),
  `review` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `clinic_schedules`
--

CREATE TABLE `clinic_schedules` (
  `id` int(11) NOT NULL,
  `clinic_id` int(11) NOT NULL,
  `day_of_week` enum('sunday','monday','tuesday','wednesday','thursday','friday','saturday') NOT NULL,
  `is_closed` tinyint(1) DEFAULT 0,
  `open_time` time DEFAULT NULL,
  `close_time` time DEFAULT NULL,
  `break_start` time DEFAULT NULL,
  `break_end` time DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clinic_schedules`
--

INSERT INTO `clinic_schedules` (`id`, `clinic_id`, `day_of_week`, `is_closed`, `open_time`, `close_time`, `break_start`, `break_end`) VALUES
(1, 1, 'monday', 0, '10:00:00', '17:00:00', '12:30:00', '13:15:00'),
(2, 1, 'saturday', 1, NULL, NULL, NULL, NULL),
(3, 1, 'sunday', 0, '10:00:00', '17:00:00', '12:30:00', '13:15:00'),
(5, 1, 'tuesday', 0, '10:00:00', '17:00:00', '12:30:00', '13:15:00'),
(6, 1, 'wednesday', 0, '10:00:00', '17:00:00', '12:30:00', '13:15:00'),
(7, 1, 'thursday', 0, '10:00:00', '17:00:00', '12:30:00', '13:15:00'),
(8, 1, 'friday', 0, '10:00:00', '17:00:00', '12:30:00', '13:15:00');

-- --------------------------------------------------------

--
-- Table structure for table `clinic_staff`
--

CREATE TABLE `clinic_staff` (
  `id` int(11) NOT NULL,
  `clinic_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('receptionist') DEFAULT 'receptionist',
  `status` enum('pending','active','rejected') DEFAULT 'pending',
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reason` text DEFAULT NULL,
  `hired_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clinic_staff`
--

INSERT INTO `clinic_staff` (`id`, `clinic_id`, `user_id`, `role`, `status`, `reason`, `hired_at`) VALUES
(1, 1, 7, 'receptionist', 'active', NULL, '2026-04-19 23:39:25'),
(2, 1, 11, 'receptionist', 'pending', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `doctor_documents`
--

CREATE TABLE `doctor_documents` (
  `id` int(11) NOT NULL,
  `doctor_kyc_id` int(11) NOT NULL,
  `document_category_id` int(11) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `doctor_documents`
--

INSERT INTO `doctor_documents` (`id`, `doctor_kyc_id`, `document_category_id`, `file_path`, `metadata`, `created_at`) VALUES
(1, 1, 1, 'uploads/kyc/doc-1776627163510-510594389-Untitled_design-removebg-preview.png', NULL, '2026-04-19 19:32:43'),
(2, 1, 1, 'uploads/kyc/doc-1776627163512-783850877-Untitled_design-removebg-preview (1).png', NULL, '2026-04-19 19:32:43'),
(3, 1, 3, 'uploads/kyc/doc-1776627446869-45598274-Education_Doctor_1.png', '{\"degree\":\"MBBS\",\"year\":2015}', '2026-04-19 19:37:26'),
(4, 1, 2, 'uploads/kyc/doc-1776627815930-337233847-Untitled_design-removebg-preview (2).png', '{\"degree\":\"+2 Science Biology\",\"year\":2010}', '2026-04-19 19:43:35'),
(5, 1, 2, 'uploads/kyc/doc-1776627815933-249992535-Untitled design (1).png', '{\"degree\":\"+2 Science Biology\",\"year\":2010}', '2026-04-19 19:43:35'),
(6, 1, 4, 'uploads/kyc/doc-1776628288845-15299260-Untitled_design-removebg-preview (3).png', NULL, '2026-04-19 19:51:28'),
(7, 1, 4, 'uploads/kyc/doc-1776628288847-288864916-Untitled_design__1__1.33.31_AM-removebg-preview.png', NULL, '2026-04-19 19:51:28'),
(8, 1, 6, 'uploads/kyc/doc-1776628661778-566815517-Untitled design 1.40.23â¯AM.png', NULL, '2026-04-19 19:57:41'),
(9, 1, 6, 'uploads/kyc/doc-1776628661780-996938071-Untitled_design__1_-removebg-preview (1).png', NULL, '2026-04-19 19:57:41'),
(10, 3, 6, 'uploads/kyc/doc-1776628758733-944921804-Untitled design 1.40.23â¯AM.png', NULL, '2026-04-19 19:59:18'),
(11, 3, 6, 'uploads/kyc/doc-1776628758736-485638689-Untitled_design__1_-removebg-preview (1).png', NULL, '2026-04-19 19:59:18'),
(14, 3, 4, 'uploads/kyc/doc-1776629672196-278846343-Untitled_design-removebg-preview (3).png', NULL, '2026-04-19 20:14:32'),
(15, 3, 4, 'uploads/kyc/doc-1776629672198-890068612-Untitled_design__1__1.33.31_AM-removebg-preview.png', NULL, '2026-04-19 20:14:32'),
(16, 3, 2, 'uploads/kyc/doc-1776629759620-156619764-Untitled_design__1_-removebg-preview.png', '{\"degree\":\"+2 Science Biology\",\"year\":2010}', '2026-04-19 20:15:59'),
(17, 3, 2, 'uploads/kyc/doc-1776629759622-99941309-Untitled_design-removebg-preview (2).png', '{\"degree\":\"+2 Science Biology\",\"year\":2010}', '2026-04-19 20:15:59'),
(18, 3, 3, 'uploads/kyc/doc-1776629884216-17228596-Education_Doctor_1.png', '{\"degree\":\"MBBS\",\"year\":2016}', '2026-04-19 20:18:04'),
(19, 3, 1, 'uploads/kyc/doc-1776629975071-729555364-Untitled_design-removebg-preview.png', NULL, '2026-04-19 20:19:35'),
(20, 3, 1, 'uploads/kyc/doc-1776629975073-578187395-Untitled_design-removebg-preview (1).png', NULL, '2026-04-19 20:19:35');

-- --------------------------------------------------------

--
-- Table structure for table `doctor_kyc`
--

CREATE TABLE `doctor_kyc` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `nmc_registration_number` varchar(50) DEFAULT NULL,
  `nmc_registration_date` date DEFAULT NULL,
  `council_name` varchar(100) DEFAULT 'Nepal Medical Council',
  `years_experience` int(11) DEFAULT 0,
  `status` enum('draft','pending','under_review','verified','rejected') NOT NULL,
  `is_submitted` tinyint(1) DEFAULT 0,
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `doctor_kyc`
--

INSERT INTO `doctor_kyc` (`id`, `user_id`, `category_id`, `nmc_registration_number`, `nmc_registration_date`, `council_name`, `years_experience`, `status`, `is_submitted`, `verified_by`, `verified_at`, `rejection_reason`, `created_at`, `updated_at`) VALUES
(1, 10, 5, NULL, NULL, 'Nepal Medical Council', 0, 'draft', 0, NULL, NULL, NULL, '2026-04-19 19:06:03', '2026-04-19 20:40:59'),
(2, 12, 4, NULL, NULL, 'Nepal Medical Council', 0, 'verified', 1, 1, '2026-04-19 20:50:03', NULL, '2026-04-19 19:06:19', '2026-04-19 20:50:03'),
(3, 4, 1, NULL, NULL, 'Nepal Medical Council', 0, 'verified', 1, 1, '2026-04-19 20:47:19', NULL, '2026-04-19 19:06:45', '2026-04-19 20:47:19');

-- --------------------------------------------------------

--
-- Table structure for table `doctor_reviews`
--

CREATE TABLE `doctor_reviews` (
  `id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `clinic_id` int(11) NOT NULL,
  `rating` tinyint(1) NOT NULL CHECK (`rating` between 1 and 5),
  `review` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `doctor_schedules`
--

CREATE TABLE `doctor_schedules` (
  `id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `clinic_id` int(11) NOT NULL,
  `day_of_week` enum('sunday','monday','tuesday','wednesday','thursday','friday','saturday') NOT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `break_start` time DEFAULT NULL,
  `break_end` time DEFAULT NULL,
  `slot_duration_minutes` int(11) DEFAULT 15,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `doctor_schedules`
--

INSERT INTO `doctor_schedules` (`id`, `doctor_id`, `clinic_id`, `day_of_week`, `is_available`, `start_time`, `end_time`, `break_start`, `break_end`, `slot_duration_minutes`, `created_at`, `updated_at`) VALUES
(1, 12, 2, 'monday', 1, '09:00:00', '14:00:00', '11:30:00', '12:00:00', 10, '2026-05-24 20:49:11', '2026-05-24 20:49:11');

-- --------------------------------------------------------

--
-- Table structure for table `document_categories`
--

CREATE TABLE `document_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `min_files` int(11) DEFAULT 1,
  `max_files` int(11) DEFAULT 5,
  `requires_metadata` tinyint(1) DEFAULT 0,
  `is_required` tinyint(1) DEFAULT 1,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_categories`
--

INSERT INTO `document_categories` (`id`, `name`, `description`, `min_files`, `max_files`, `requires_metadata`, `is_required`, `is_active`, `created_at`) VALUES
(1, 'Citizenship', 'Upload front and back image of your citizenship', 1, 2, 0, 1, 1, '2026-04-19 17:48:53'),
(2, 'Education +2', 'Upload +2 certificate', 1, 3, 1, 1, 1, '2026-04-19 17:50:39'),
(3, 'Education MBBS', 'Upload MBBS certificate', 1, 5, 1, 1, 1, '2026-04-19 17:51:25'),
(4, 'NMC Registration', 'Nepal Medical Council registration ce', 1, 2, 0, 1, 1, '2026-04-19 17:52:27'),
(5, 'Internship', 'Internship', 0, 3, 1, 0, 1, '2026-04-19 17:53:17'),
(6, 'Medical License', 'Medical practice license', 1, 2, 0, 1, 1, '2026-04-19 17:54:49'),
(7, 'Other Documents', 'Any additional documents', 0, 5, 0, 0, 1, '2026-04-19 17:55:54');

-- --------------------------------------------------------

--
-- Table structure for table `generated_slots`
--

CREATE TABLE `generated_slots` (
  `id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `clinic_id` int(11) NOT NULL,
  `slot_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `status` enum('available','booked','blocked') DEFAULT 'available',
  `appointment_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `appointment_id` int(11) DEFAULT NULL,
  `to_user_id` int(11) NOT NULL,
  `from_user_id` int(11) NOT NULL,
  `transactionId` varchar(255) DEFAULT NULL,
  `pidx` varchar(255) DEFAULT NULL,
  `amount` decimal(13,4) NOT NULL CHECK (`amount` >= 0),
  `transaction_type` enum('credit','debit') NOT NULL,
  `remarks` varchar(255) NOT NULL,
  `date_from_verification_req` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`date_from_verification_req`)),
  `api_query_from_user` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`api_query_from_user`)),
  `payment_gateway` enum('khalti','esewa') NOT NULL,
  `status` enum('pending','completed','refunded') DEFAULT 'pending',
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pricing`
--

CREATE TABLE `pricing` (
  `id` int(11) NOT NULL,
  `clinic_id` int(11) NOT NULL,
  `price` decimal(13,4) NOT NULL CHECK (`price` >= 0),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `receptionist_kyc`
--

CREATE TABLE `receptionist_kyc` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `citizenship_number` varchar(50) NOT NULL,
  `issue_date` date NOT NULL,
  `issue_district` varchar(50) NOT NULL,
  `citizenship_image` varchar(255) NOT NULL,
  `status` enum('pending','verified','rejected') DEFAULT 'pending',
  `verified_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reason` text DEFAULT NULL,
  `rejected_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `receptionist_kyc`
--

INSERT INTO `receptionist_kyc` (`id`, `user_id`, `citizenship_number`, `issue_date`, `issue_district`, `citizenship_image`, `status`, `verified_by`, `created_at`, `reason`, `rejected_date`) VALUES
(1, 11, '07-333-123456', '2018-12-14', 'Morang', 'uploads/others/1776640072445-47236559.png', 'verified', 1, '2026-04-19 23:07:52', NULL, NULL),
(2, 7, '07-331-123456', '2020-10-01', 'Morang', 'uploads/others/1776641326828-823097668.png', 'verified', 1, '2026-04-19 23:28:46', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `first_name` varchar(25) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `dob_bs` date DEFAULT NULL,
  `dob_ad` date DEFAULT NULL,
  `province` varchar(25) NOT NULL,
  `district` varchar(25) NOT NULL,
  `city` varchar(25) NOT NULL,
  `ward` int(11) NOT NULL,
  `tole` varchar(50) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `role` enum('patient','doctor','admin','receptionist') NOT NULL DEFAULT 'patient',
  `category_id` int(11) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `gender` enum('male','female','others') NOT NULL DEFAULT 'others',
  `is_active` tinyint(1) DEFAULT 1,
  `email_verified` tinyint(1) DEFAULT 0,
  `emailVerificationToken` varchar(255) DEFAULT NULL,
  `emailVerificationExpires` datetime DEFAULT NULL,
  `otp` varchar(6) DEFAULT NULL,
  `otp_expiry` datetime DEFAULT NULL,
  `is_reset_password_token` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `dob_bs`, `dob_ad`, `province`, `district`, `city`, `ward`, `tole`, `email`, `phone_number`, `profile_image`, `role`, `category_id`, `password`, `created_at`, `gender`, `is_active`, `email_verified`, `emailVerificationToken`, `emailVerificationExpires`, `otp`, `otp_expiry`, `is_reset_password_token`) VALUES
(1, 'Shuvam', 'BC', NULL, '2020-01-01', 'Koshi', 'Morang', 'Biratnagar', 7, 'Hatkhola', 'shuvambc@gmail.com', '9876543102', 'uploads/admin/shuvam-bc-1776459679906.jpeg', 'admin', NULL, '$2b$10$GDyMCoPjQ.xdFkjQF3orCOp.Nu9YATMPklT9JUjx/QcuVn4iLHwNm', '2026-04-06 19:09:55', 'male', 1, 0, NULL, NULL, NULL, NULL, 0),
(2, 'Radha', 'Rajbanshi', NULL, '2000-01-01', 'Koshi', 'Morang', 'Biratnagar', 10, 'Mahendra chowk', 'radharajbanshi@gmail.com', '9876543103', 'uploads/users/1776605783305.jpeg', 'patient', NULL, '$2b$10$JUWjQeSuo6JqJuk7.QopzuU1ESHQxU1OwXss8CUV3MZOdBAv8A9x2', '2026-04-17 20:23:42', 'female', 1, 0, NULL, NULL, NULL, NULL, 0),
(4, 'Shyam', 'Pradhan', NULL, '2000-01-01', 'Koshi', 'Morang', 'Biratnagar', 10, 'Mahendra chowk', 'shyampradhan@gmail.com', '9876543104', 'uploads/doctor/shyam-pradhan-1776458021368.jpeg', 'doctor', 1, '$2b$10$6gCIogOHkJ3uA/vfmoT5ee2krDHOMUhsoGnSlWr4oPSrZjLN5abE6', '2026-04-17 20:33:41', 'male', 1, 0, NULL, NULL, NULL, NULL, 0),
(6, 'Root', 'Admin', NULL, '2000-01-01', 'Koshi', 'Morang', 'Biratnagar', 10, 'Mahendra chowk', 'rootadmin@gmail.com', '9876543105', NULL, 'admin', NULL, '$2b$10$6OF1ntclaPi06t6BBQn0reRz0pPmopVjAw53vf4znMOD4TradMuNO', '2026-04-17 21:31:36', 'male', 1, 0, NULL, NULL, NULL, NULL, 0),
(7, 'Ganesh', 'Shah', NULL, '2000-01-01', 'Koshi', 'Morang', 'Biratnagar', 10, 'Mahendra chowk', 'ganeshshah@gmail.com', '9861000002', 'uploads/users/1776605519132.jpeg', 'receptionist', NULL, '$2b$10$h7cor4Unw6n4bF5lEUxlRurZ.KnK2f8v6U9LZhVUzBysvloqRpVCW', '2026-04-17 21:33:58', 'male', 1, 0, NULL, NULL, NULL, NULL, 0),
(8, 'Sita', 'Thapa', '2050-06-10', '1993-09-26', 'Bagmati', 'Kathmandu', 'Kathmandu', 5, 'Baluwatar', 'sitathapa@gmail.com', '9841000002', 'uploads/users/1776600361355.jpeg', 'patient', NULL, '$2b$10$ZqnO.v9/UEnIj/LorgkvUOWTM59VwCt.vYAr72VYRJcI7Rip2jpF6', '2026-04-19 12:06:01', 'female', 1, 0, NULL, NULL, NULL, NULL, 0),
(9, 'Hari', 'Rai', '2055-10-25', '1999-02-08', 'Gandaki', 'Kaski', 'Pokhara', 15, 'Lakeside', 'harirai@gmail.com', '9841000003', 'uploads/users/1776600499737.jpeg', 'patient', NULL, '$2b$10$mwIGPuwF11ug3wrPWfx9zeDQruEhhFDEGkeU13a15lg86RW0kOrES', '2026-04-19 12:08:19', 'male', 1, 0, NULL, NULL, NULL, NULL, 0),
(10, 'Anil', 'Shrestha', '2040-01-05', '1983-04-18', 'Koshi', 'Sunsari', 'Dharan', 8, 'Buddha Chowk', 'dr.anilshrestha@gmail.com', '9851000001', 'uploads/users/1776600688162.jpeg', 'doctor', 5, '$2b$10$3bR6f753UqWWMSq4qsJRDuLIlZBzOkrSAv3tVn1ICWOQKUuYqwbT.', '2026-04-19 12:11:28', 'male', 1, 0, NULL, NULL, NULL, NULL, 0),
(11, 'Nita', 'Magar', '2058-04-01', '2001-07-16', 'Koshi', 'Sunsari', 'Inaruwa', 1, 'Main Market', 'nitamagar@gmail.com', '9861000001', 'uploads/users/1776600810144.jpeg', 'receptionist', NULL, '$2b$10$MJywyWEofpl7jhtOGKWoUePNnccpH7FW/98rRz3ezLcg9j7Lv23yi', '2026-04-19 12:13:30', 'female', 1, 0, NULL, NULL, NULL, NULL, 0),
(12, 'Bishnu', 'Yadav', '2038-08-12', '1981-11-27', 'Madhesh', 'Dhanusha', 'Janakpur', 9, 'Ramananda Chowk', 'dr.bishnuyadav@gmail.com', '9851000003', 'uploads/users/1776601528431.jpeg', 'doctor', 4, '$2b$10$kvayMOksFpuvPOd5tcIjjunmwUY/qyX0Wwcpq7xDK3JkpDqD.MWZ6', '2026-04-19 12:25:28', 'male', 1, 0, NULL, NULL, NULL, NULL, 0),
(18, 'Shuvam', 'BC', '2038-08-12', '1981-11-27', 'Koshi', 'Morang', 'Biratnagar', 7, 'Hatkhola', 'bcshuvam@gmail.com', '9841000005', NULL, 'admin', 4, '$2b$10$d6le.kLXlUwHHpQHD4vSZutdjggwUxCIMjvbXIaW3mNqzgGGHPOIm', '2026-04-28 01:53:04', 'male', 1, 1, NULL, NULL, NULL, NULL, 1),
(19, 'Shuvam', 'BC Patient', '2038-08-12', '1981-11-27', 'Koshi', 'Morang', 'Biratnagar', 7, 'Hatkhola', 'dean42328@gmail.com', '9841000006', NULL, 'patient', 4, '$2b$10$pWCH8kuv03V428SdtLdje.hmORanxdbXfNb1b/E87h9eI9ThjaE4a', '2026-05-10 14:04:15', 'male', 1, 0, '0d51f3ae81aaef3350bed7d9ea46049b3ea9453e40213a611cff14b2587c3eb8', '2026-05-10 20:49:15', NULL, NULL, 0),
(20, 'Shuvam', 'BC', '2038-08-12', '1981-11-27', 'Koshi', 'Morang', 'Biratnagar', 7, 'Hatkhola', 'hello1234@gmail.com', '9841000008', NULL, 'patient', 4, '$2b$10$hYm0mVDtQw6OzfvPuJ2sa.JeSicEV7moesb3I35iZYnxnwr5FcKs2', '2026-05-10 14:17:01', 'male', 1, 0, '5cab875b17af4414522dd119dc9df606aca915f716ca7998edc1817760c3d2ac', '2026-05-10 21:02:01', NULL, NULL, 0),
(21, 'Prawesh', 'gupta', '2038-08-12', '1981-11-27', 'Koshi', 'Morang', 'Biratnagar', 7, 'Hatkhola', 'np02cs4a240055@bicnepal.edu.np', '9841000007', 'uploads/users/1778422696348.jpeg', 'patient', 4, '$2b$10$oLfpyqYRHlPXfz.K8o.D3.8tYz5GCjsmP6A7N6NwI.BBEianh4drK', '2026-05-10 14:18:16', 'male', 1, 0, '53ecd062d7eedc282f1d0c1d0065e97f9e8bcbb704595255f920ebee9338c539', '2026-05-10 21:03:16', NULL, NULL, 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `clinic_id` (`clinic_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `receptionist_id` (`receptionist_id`),
  ADD KEY `slot_id` (`slot_id`),
  ADD KEY `payment_id` (`payment_id`),
  ADD KEY `rescheduled_by` (`rescheduled_by`),
  ADD KEY `idx_doctor_id` (`doctor_id`);

--
-- Indexes for table `appointment_logs`
--
ALTER TABLE `appointment_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `appointment_id` (`appointment_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `clinics`
--
ALTER TABLE `clinics`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `doctor_id` (`doctor_id`);

--
-- Indexes for table `clinic_doctors`
--
ALTER TABLE `clinic_doctors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_clinic_doctor` (`clinic_id`,`doctor_id`),
  ADD KEY `doctor_id` (`doctor_id`);

--
-- Indexes for table `clinic_holidays`
--
ALTER TABLE `clinic_holidays`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_clinic_holiday` (`clinic_id`,`holiday_date`);

--
-- Indexes for table `clinic_reviews`
--
ALTER TABLE `clinic_reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_clinic_review` (`clinic_id`,`patient_id`,`appointment_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `appointment_id` (`appointment_id`);

--
-- Indexes for table `clinic_schedules`
--
ALTER TABLE `clinic_schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_day` (`clinic_id`,`day_of_week`);

--
-- Indexes for table `clinic_staff`
--
ALTER TABLE `clinic_staff`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_staff` (`clinic_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `doctor_documents`
--
ALTER TABLE `doctor_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_kyc` (`doctor_kyc_id`),
  ADD KEY `idx_category` (`document_category_id`);

--
-- Indexes for table `doctor_kyc`
--
ALTER TABLE `doctor_kyc`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `nmc_registration_number` (`nmc_registration_number`),
  ADD KEY `verified_by` (`verified_by`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_category` (`category_id`);

--
-- Indexes for table `doctor_reviews`
--
ALTER TABLE `doctor_reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_doctor_review` (`doctor_id`,`patient_id`,`appointment_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `appointment_id` (`appointment_id`),
  ADD KEY `clinic_id` (`clinic_id`);

--
-- Indexes for table `doctor_schedules`
--
ALTER TABLE `doctor_schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_doctor_clinic_day` (`doctor_id`,`clinic_id`,`day_of_week`),
  ADD KEY `clinic_id` (`clinic_id`);

--
-- Indexes for table `document_categories`
--
ALTER TABLE `document_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `generated_slots`
--
ALTER TABLE `generated_slots`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_slot` (`doctor_id`,`slot_date`,`start_time`),
  ADD KEY `clinic_id` (`clinic_id`),
  ADD KEY `appointment_id` (`appointment_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transactionId` (`transactionId`),
  ADD UNIQUE KEY `pidx` (`pidx`),
  ADD KEY `idx_to_user` (`to_user_id`),
  ADD KEY `idx_from_user` (`from_user_id`),
  ADD KEY `appointment_id` (`appointment_id`);

--
-- Indexes for table `pricing`
--
ALTER TABLE `pricing`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_clinic` (`clinic_id`);

--
-- Indexes for table `receptionist_kyc`
--
ALTER TABLE `receptionist_kyc`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `phone_number` (`phone_number`),
  ADD KEY `category_id` (`category_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `appointment_logs`
--
ALTER TABLE `appointment_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `clinics`
--
ALTER TABLE `clinics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `clinic_doctors`
--
ALTER TABLE `clinic_doctors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `clinic_holidays`
--
ALTER TABLE `clinic_holidays`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `clinic_reviews`
--
ALTER TABLE `clinic_reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `clinic_schedules`
--
ALTER TABLE `clinic_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `clinic_staff`
--
ALTER TABLE `clinic_staff`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `doctor_documents`
--
ALTER TABLE `doctor_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `doctor_kyc`
--
ALTER TABLE `doctor_kyc`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `doctor_reviews`
--
ALTER TABLE `doctor_reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `doctor_schedules`
--
ALTER TABLE `doctor_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `document_categories`
--
ALTER TABLE `document_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `generated_slots`
--
ALTER TABLE `generated_slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pricing`
--
ALTER TABLE `pricing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `receptionist_kyc`
--
ALTER TABLE `receptionist_kyc`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `appointments_ibfk_3` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `appointments_ibfk_4` FOREIGN KEY (`receptionist_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `appointments_ibfk_5` FOREIGN KEY (`slot_id`) REFERENCES `generated_slots` (`id`);

--
-- Constraints for table `appointment_logs`
--
ALTER TABLE `appointment_logs`
  ADD CONSTRAINT `appointment_logs_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `clinics`
--
ALTER TABLE `clinics`
  ADD CONSTRAINT `clinics_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `clinic_doctors`
--
ALTER TABLE `clinic_doctors`
  ADD CONSTRAINT `clinic_doctors_ibfk_1` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `clinic_doctors_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `clinic_holidays`
--
ALTER TABLE `clinic_holidays`
  ADD CONSTRAINT `clinic_holidays_ibfk_1` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `clinic_reviews`
--
ALTER TABLE `clinic_reviews`
  ADD CONSTRAINT `clinic_reviews_ibfk_1` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `clinic_reviews_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `clinic_reviews_ibfk_3` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `clinic_schedules`
--
ALTER TABLE `clinic_schedules`
  ADD CONSTRAINT `clinic_schedules_ibfk_1` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `clinic_staff`
--
ALTER TABLE `clinic_staff`
  ADD CONSTRAINT `clinic_staff_ibfk_1` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `clinic_staff_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `doctor_documents`
--
ALTER TABLE `doctor_documents`
  ADD CONSTRAINT `doctor_documents_ibfk_1` FOREIGN KEY (`doctor_kyc_id`) REFERENCES `doctor_kyc` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `doctor_documents_ibfk_2` FOREIGN KEY (`document_category_id`) REFERENCES `document_categories` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `doctor_kyc`
--
ALTER TABLE `doctor_kyc`
  ADD CONSTRAINT `doctor_kyc_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `doctor_kyc_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `doctor_kyc_ibfk_3` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `doctor_reviews`
--
ALTER TABLE `doctor_reviews`
  ADD CONSTRAINT `doctor_reviews_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `doctor_reviews_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `doctor_reviews_ibfk_3` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `doctor_reviews_ibfk_4` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `doctor_schedules`
--
ALTER TABLE `doctor_schedules`
  ADD CONSTRAINT `doctor_schedules_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `doctor_schedules_ibfk_2` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `generated_slots`
--
ALTER TABLE `generated_slots`
  ADD CONSTRAINT `generated_slots_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `generated_slots_ibfk_2` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`),
  ADD CONSTRAINT `generated_slots_ibfk_3` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`);

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_appointment_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `pricing`
--
ALTER TABLE `pricing`
  ADD CONSTRAINT `pricing_ibfk_1` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `receptionist_kyc`
--
ALTER TABLE `receptionist_kyc`
  ADD CONSTRAINT `receptionist_kyc_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
