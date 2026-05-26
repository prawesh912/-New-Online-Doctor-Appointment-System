# Carefull — Online Doctor Appointment System Backend API Documentation

Welcome to the backend API documentation for **Carefull**, a premium, state-of-the-art doctor appointment system. This documentation outlines all available routes, methods, authorizations, parameters, and request/response structures.

## Base URL
```
http://localhost:8000
```

## Authentication & Authorization
All authenticated requests must include a Bearer JWT Token in the headers:
```http
Authorization: Bearer <your_jwt_token>
```

**Admin access:** Users with role `admin` can access any role-gated route (patient, doctor, receptionist, etc.) in addition to admin-only routes.

**Public routes (no token required):**
* `GET /api/clinics/search` — Search clinics
* `GET /api/clinics/:id/schedule` — Clinic weekly schedule
* `GET /api/clinics/:id/doctors` — Doctors at a clinic
* `GET /api/doctors` — Search verified doctors
* `GET /api/payment/complete-khalti-payment` — Khalti payment callback

---

## 🔑 User & Authentication Routes (`/api/users` & `/api/auth`)

### 1. Register User
* **Method**: `POST`
* **Route**: `/api/user/register`
* **Auth**: Public
* **Request Body**:
  ```json
  {
    "first_name": "Radha",
    "last_name": "Rajbanshi",
    "email": "radha@example.com",
    "phone_number": "9876543210",
    "password": "SecurePassword123",
    "gender": "female",
    "province": "Bagmati",
    "district": "Kathmandu",
    "city": "Kathmandu",
    "ward": 3
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully. Verification email sent."
  }
  ```

### 2. Login User
* **Method**: `POST`
* **Route**: `/api/auth/login`
* **Auth**: Public
* **Request Body**:
  ```json
  {
    "email": "radha@example.com",
    "password": "SecurePassword123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 2,
      "first_name": "Radha",
      "last_name": "Rajbanshi",
      "role": "patient"
    }
  }
  ```

---

## 🏥 Clinic & Clinic Search Routes (`/api/clinics`)

### 1. Create Clinic
* **Method**: `POST`
* **Route**: `/api/clinics`
* **Auth**: Authenticated (Role: `doctor`)
* **Request Body**:
  ```json
  {
    "name": "Bagmati Care Clinic",
    "description": "General health and dental services",
    "province": "Bagmati",
    "district": "Kathmandu",
    "city": "Kathmandu",
    "ward": 5,
    "tole": "Baneshwor",
    "address": "Near XYZ Chowk",
    "primary_phone_number": "9800000000",
    "email": "bagmaticlinic@example.com"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Clinic created successfully",
    "clinic_id": 1
  }
  ```

### 2. Set Clinic Pricing
* **Method**: `POST`
* **Route**: `/api/clinics/:clinic_id/pricing`
* **Auth**: Authenticated (Role: `doctor` — must own the clinic)
* **Description**: Sets or updates the per-appointment price for a clinic. Patients cannot initialize Khalti payment until pricing is configured for that clinic.
* **Request Body**:
  ```json
  {
    "price": 500
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Clinic pricing saved successfully",
    "clinic_id": 1,
    "price": 500
  }
  ```
* **Error Responses**:
  * `400` — `price` missing or negative
  * `403` — Caller is not the clinic owner
  * `404` — Clinic not found

### 3. Search Clinics
* **Method**: `GET`
* **Route**: `/api/clinics/search`
* **Auth**: Public
* **Query Parameters**:
  * `province` (string)
  * `district` (string)
  * `city` (string)
  * `ward` (number)
  * `name` (string) - partial match
  * `min_rating` (number, 1-5)
  * `max_rating` (number, 1-5)
  * `category_id` (number) - specialization category
  * `page` (number, default: 1)
  * `limit` (number, default: 10)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "total_data": 25,
    "total_pages": 3,
    "current_page": 1,
    "has_next_page": true,
    "count": 10,
    "clinics": [
      {
        "id": 1,
        "name": "Bagmati Care Clinic",
        "avg_rating": 4.5,
        "review_count": 12,
        "specialization": "General Physician",
        "doctor_first": "Shyam",
        "doctor_last": "Pradhan",
        "province": "Bagmati"
      }
    ]
  }
  ```

### 4. Get Clinic Schedule
* **Method**: `GET`
* **Route**: `/api/clinics/:id/schedule`
* **Auth**: Public
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "clinic": { "id": 1, "name": "Bagmati Care Clinic" },
    "schedule": [
      {
        "day_of_week": "monday",
        "is_closed": 0,
        "open_time": "10:00:00",
        "close_time": "17:00:00"
      }
    ],
    "upcoming_holidays": [
      { "holiday_date": "2026-06-01", "reason": "Dashain" }
    ]
  }
  ```

### 5. Get Doctors Working at a Clinic
* **Method**: `GET`
* **Route**: `/api/clinics/:id/doctors`
* **Auth**: Public
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 2,
    "doctors": [
      {
        "id": 4,
        "first_name": "Shyam",
        "last_name": "Pradhan",
        "specialization": "General Physician",
        "avg_rating": 4.6,
        "doctor_role": "owner"
      }
    ]
  }
  ```

### 6. Live Token Status
* **Method**: `GET`
* **Route**: `/api/clinics/:clinic_id/token-status`
* **Auth**: Authenticated (Role: `patient` - must have a non-completed, non-cancelled appointment for today at this clinic)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "current_token": "20260525-003",
    "your_token": "20260525-007",
    "appointments_ahead": 4
  }
  ```

### 6. Receptionist Apply to Clinic
* **Method**: `POST`
* **Route**: `/api/clinics/apply`
* **Auth**: Authenticated (Role: `receptionist` — KYC must be verified)
* **Request Body**:
  ```json
  { "clinic_id": 1 }
  ```
* **Success Response (201 Created)**:
  ```json
  { "success": true, "message": "Applied to clinic successfully" }
  ```

### 7. Receptionist View Own Applications
* **Method**: `GET`
* **Route**: `/api/clinics/my-applications`
* **Auth**: Authenticated (Role: `receptionist`)
* **Query Parameters**: `status`, `search` (clinic name), `start_date`, `end_date` (default: today), `page`, `limit`

### 8. Doctor Review Receptionist Applications
* **Method**: `GET`
* **Route**: `/api/clinics/applications`
* **Auth**: Authenticated (Role: `doctor` — clinic owner)
* **Query Parameters**:
  * `status` (`pending`, `active`, `rejected`)
  * `clinic_id`, `search` (receptionist name/email)
  * `start_date`, `end_date` (default: today)
  * `page`, `limit`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "date_from": "2026-05-25",
    "date_to": "2026-05-25",
    "total_data": 3,
    "applications": [
      {
        "application_id": 2,
        "clinic_name": "Bagmati Care Clinic",
        "first_name": "Nita",
        "last_name": "Magar",
        "status": "pending",
        "applied_at": "2026-05-25T10:00:00.000Z"
      }
    ]
  }
  ```

### 9. Doctor Approve or Reject Application
* **Method**: `PATCH` or `PUT`
* **Route**: `/api/clinics/staff/:staff_id`
* **Auth**: Authenticated (Role: `doctor` — clinic owner)
* **Request Body**:
  ```json
  { "status": "active" }
  ```
  Use `"rejected"` to decline. Sets `hired_at` when approved.

### 10. Add Verified Doctor to Clinic
* **Method**: `POST`
* **Route**: `/api/clinics/add-doctor`
* **Auth**: Authenticated (Role: `doctor` - clinic owner only)
* **Request Body**:
  ```json
  {
    "clinic_id": 1,
    "associate_doctor_id": 12
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Doctor added to clinic successfully"
  }
  ```

---

## 📅 Schedule & Holidays (`/api/clinics/:clinic_id/holidays` & `/api/doctor-schedule`)

### Clinic weekly schedule (owner doctor)
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/clinics/:clinic_id/schedule` | Upsert one or more days (bulk) |
| `PUT` | `/api/clinics/:clinic_id/schedule/:schedule_id` | Update a single schedule row by id |
| `DELETE` | `/api/clinics/:clinic_id/schedule/:schedule_id` | Delete a schedule row by id |

### Doctor weekly schedule (at clinic)
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/doctor-schedule/:clinic_id/schedule` | Upsert one or more days (bulk) |
| `PUT` | `/api/doctor-schedule/:clinic_id/schedule/:schedule_id` | Update a single schedule row by id |
| `DELETE` | `/api/doctor-schedule/:clinic_id/schedule/:schedule_id` | Delete a schedule row by id |

### 1. Set Clinic Holiday (Closure)
* **Method**: `POST`
* **Route**: `/api/clinics/:clinic_id/holidays`
* **Auth**: Authenticated (Role: `doctor` - owner only)
* **Request Body**:
  ```json
  {
    "holiday_date": "2026-06-15",
    "reason": "Clinic renovation"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Holiday scheduled successfully"
  }
  ```

### 2. Upsert Doctor Weekly Schedule
* **Method**: `POST`
* **Route**: `/api/doctor-schedule/:clinic_id/schedule`
* **Auth**: Authenticated (Role: `doctor` - owner or associate)
* **Request Body**:
  ```json
  {
    "schedules": [
      {
        "day_of_week": "monday",
        "is_available": true,
        "start_time": "09:00:00",
        "end_time": "14:00:00",
        "break_start": "11:30:00",
        "break_end": "12:00:00",
        "slot_duration_minutes": 15
      }
    ]
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Doctor schedule updated successfully"
  }
  ```

---

## 🏥 Appointment Routes (`/api/appointments`)

### 1. Book Appointment (Patient)
* **Method**: `POST`
* **Route**: `/api/appointments/book`
* **Auth**: Authenticated (Role: `patient`)
* **Validation**: Only same-day or next-day bookings allowed. No booking in past times. Clinic must not be closed (holidays check). Generates a daily unique token format: `YYYYMMDD-NNN`. Sends transactional emails to patient, doctor, and clinic.
* **Payment mode** (`payment_mode` on appointment, default **`Pay Later`**):
  * **`Pay Later`** — Patient pays at the clinic visit. Receptionist later calls `POST /api/payment/initialize-khalti-payment` and shares the Khalti URL with the patient.
  * **`Prepayment`** — Khalti payment is started immediately when booking succeeds. Requires `website_url` in the request body. Response includes `payment_url` and `pidx`.
* **Request Body**:
  ```json
  {
    "clinic_id": 1,
    "doctor_id": 4,
    "appointment_date": "2026-05-26",
    "appointment_time": "10:30:00",
    "reason": "Chest pain and mild fever",
    "payment_mode": "Pay Later",
    "website_url": "http://localhost:3000"
  }
  ```
  For **Prepayment**, set `"payment_mode": "Prepayment"` and include `website_url`. Omit `website_url` for Pay Later.
* **Success Response (201 Created)** — Pay Later:
  ```json
  {
    "success": true,
    "message": "Appointment booked successfully",
    "appointment_id": 10,
    "token_number": "20260526-001",
    "payment_mode": "Pay Later"
  }
  ```
* **Success Response (201 Created)** — Prepayment (includes Khalti checkout):
  ```json
  {
    "success": true,
    "message": "Appointment booked. Complete prepayment via Khalti.",
    "appointment_id": 10,
    "token_number": "20260526-001",
    "payment_mode": "Prepayment",
    "payment_url": "https://test-pay.khalti.com/...",
    "pidx": "BU8rPHuQZ...",
    "amount": 500
  }
  ```

### 2. Cancel Appointment (Patient)
* **Method**: `DELETE`
* **Route**: `/api/appointments/my/:id/cancel`
* **Auth**: Authenticated (Role: `patient` owner)
* **Note**: No cancellation charge is applied. Emails are sent to patient, doctor, and clinic.
* **Request Body** (optional):
  ```json
  {
    "reason": "Emergency travel"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Appointment cancelled successfully"
  }
  ```

### 3. Reschedule Appointment (Doctor)
* **Method**: `PATCH`
* **Route**: `/api/appointments/doctor/reschedule/:id`
* **Auth**: Authenticated (Role: `doctor`)
* **Request Body**:
  ```json
  {
    "new_date": "2026-05-27",
    "new_time": "14:00:00",
    "reason": "Doctor has urgent surgery"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Appointment rescheduled successfully"
  }
  ```

### 4. Confirm/Cancel/Reject Booking (Doctor or Receptionist)
* **Doctor Routes**:
  * `PATCH /api/appointments/doctor/confirm/:id`
  * `PATCH /api/appointments/doctor/cancel/:id` (requires `reason`)
* **Receptionist Routes**:
  * `PUT /api/appointments/confirm/:id`
  * `PUT /api/appointments/reject/:id` (requires `reason`)

### 5. Mark Appointment Complete
* **Method**: `PATCH` or `PUT`
* **Route**: `/api/appointments/complete/:id`
* **Auth**: Authenticated (Role: `doctor` assigned to appointment, or `receptionist` at that clinic; admin allowed)
* **Description**: Sets `appointments.status` to **`completed`** when the visit is done. Saves clinical notes to `appointments.notes`.
* **Request Body**:
  ```json
  {
    "note": "Patient examined. Prescribed rest and follow-up in 1 week."
  }
  ```
* **Validation**: Current status must be `pending`, `confirmed`, or `rescheduled`.
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Appointment marked as completed",
    "appointment_id": 10,
    "status": "completed"
  }
  ```

---

## 📋 Appointment History (`/api/appointments/history`)

All history endpoints default to **today's date** when `start_date` and `end_date` are omitted.

### 1. Patient History
* **Method**: `GET`
* **Route**: `/api/appointments/history/patient`
* **Auth**: `patient` (admin can also access)
* **Query**: `start_date`, `end_date`, `status`, `clinic_id`, `page`, `limit`

### 2. Doctor History
* **Method**: `GET`
* **Route**: `/api/appointments/history/doctor`
* **Auth**: `doctor`
* **Query**: `start_date`, `end_date`, `patient_id`, `status`, `clinic_id`, `search`, `page`, `limit`

### 3. Receptionist Clinic History
* **Method**: `GET`
* **Route**: `/api/appointments/history/receptionist/:clinic_id`
* **Auth**: `receptionist` (active at that clinic)
* **Query**: `start_date`, `end_date`, `patient_id`, `doctor_id`, `status`, `search`, `page`, `limit`

### 4. Admin — All Appointments
* **Method**: `GET`
* **Route**: `/api/appointments/history/admin`
* **Auth**: `admin`
* **Query**: `start_date`, `end_date`, `patient_id`, `doctor_id`, `clinic_id`, `status`, `page`, `limit`

**Example response shape:**
```json
{
  "success": true,
  "date_from": "2026-05-25",
  "date_to": "2026-05-25",
  "total_data": 5,
  "total_pages": 1,
  "current_page": 1,
  "has_next_page": false,
  "count": 5,
  "appointments": [ { "id": 10, "status": "confirmed", "token_number": "20260525-001" } ]
}
```

---

## 💳 Payment Routes (`/api/payment`)

### 1. Initialize Khalti Payment
* **Method**: `POST`
* **Route**: `/api/payment/initialize-khalti-payment`
* **Auth**: Authenticated (Role: `patient` or `receptionist`; admin allowed)
* **Who calls it:**
  * **Patient** — Own unpaid appointment (Prepayment retry, or Pay Later self-checkout).
  * **Receptionist** — **Pay Later** appointments at their clinic only (at visit); returns `payment_url` for the patient to complete payment.
* **Request Body**:
  ```json
  {
    "appointment_id": 10,
    "website_url": "http://localhost:3000"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "payment_url": "https://test-pay.khalti.com/epayment/?pidx=BU8rPHuQZ...",
    "pidx": "BU8rPHuQZ4BSyo6y8ADcDd",
    "amount": 500,
    "payment_mode": "Pay Later",
    "message": "Payment link ready for patient to pay at visit"
  }
  ```

### 2. Complete Khalti Payment (Callback)
* **Method**: `GET`
* **Route**: `/api/payment/complete-khalti-payment`
* **Auth**: Public
* **Query Parameters**: Redirect query params sent by Khalti (e.g. `pidx`, `transaction_id`, `amount`, `status`).
* **Success Flow**: Verifies payment with Khalti backend. If verified successfully, updates `payments` record status to `completed`, updates `appointments` status to `paid`, and redirects to front-end page (if `FRONTEND_URL` is set).

### 3. Patient Payment History
* **Method**: `GET`
* **Route**: `/api/payment/history` (also `GET /api/appointments/my/payments`)
* **Auth**: `patient` (admin can also access patient routes)
* **Query**: `start_date`, `end_date` (optional — if omitted, returns **latest 10** payments), `status`, `transaction_type`, `page`, `limit`

### 4. Admin — All Payment History
* **Method**: `GET`
* **Route**: `/api/payment/admin/history`
* **Auth**: `admin`
* **Query**: `patient_id` (optional filter), `start_date`, `end_date` (default: today), `status`, `page`, `limit`

### 5. Admin — Payment History by Patient
* **Method**: `GET`
* **Route**: `/api/payment/admin/history/:patient_id`
* **Auth**: `admin`
* **Query**: `start_date`, `end_date` (default: today), `status`, `page`, `limit`

---

## 🔍 Public Doctor Search (`/api/doctors`)

### Search Doctors
* **Method**: `GET`
* **Route**: `/api/doctors`
* **Auth**: **Public** (no token)
* **Query Parameters**: `search` (name), `category_id` (specialization)

---

## ⭐️ Reviews & Ratings (`/api/reviews`)

### 1. Submit Clinic Review
* **Method**: `POST`
* **Route**: `/api/reviews/clinic`
* **Auth**: Authenticated (Role: `patient`)
* **Validation**: Only patients who had a **completed** appointment in that clinic can submit a review. Only one review per appointment is allowed.
* **Request Body**:
  ```json
  {
    "clinic_id": 1,
    "appointment_id": 10,
    "rating": 5,
    "review": "Clean clinic and friendly receptionist."
  }
  ```

### 2. Submit Doctor Review
* **Method**: `POST`
* **Route**: `/api/reviews/doctor`
* **Auth**: Authenticated (Role: `patient`)
* **Validation**: Same as above, must have visited the doctor for a completed appointment.
* **Request Body**:
  ```json
  {
    "doctor_id": 4,
    "appointment_id": 10,
    "clinic_id": 1,
    "rating": 5,
    "review": "Very experienced and gave clear guidance."
  }
  ```

---

## 📈 Earnings & Revenue (`/api/earnings`)

### 1. Doctor Earnings
* **Method**: `GET`
* **Route**: `/api/earnings/doctor`
* **Auth**: Authenticated (Role: `doctor`)
* **Query Parameters**: `start_date`, `end_date` (optional, default to today's date).
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "date_from": "2026-05-25",
    "date_to": "2026-05-25",
    "currency": "NPR",
    "total_earnings": 1500,
    "breakdown": [
      {
        "clinic_id": 1,
        "clinic_name": "Bagmati Care Clinic",
        "appointment_count": 3,
        "earnings": 1500
      }
    ]
  }
  ```

### 2. Clinic Revenue
* **Method**: `GET`
* **Route**: `/api/earnings/clinic/:clinic_id`
* **Auth**: Authenticated (Role: `doctor` owner)
* **Query Parameters**: `start_date`, `end_date` (optional, default to today's date).
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "clinic_id": 1,
    "clinic_name": "Bagmati Care Clinic",
    "date_from": "2026-05-25",
    "date_to": "2026-05-25",
    "currency": "NPR",
    "total_revenue": 3500,
    "breakdown": [
      {
        "doctor_id": 4,
        "doctor_name": "Shyam Pradhan",
        "appointment_count": 5,
        "revenue": 2500
      },
      {
        "doctor_id": 12,
        "doctor_name": "Bishnu Yadav",
        "appointment_count": 2,
        "revenue": 1000
      }
    ]
  }
  ```

---

## 📖 Swagger API Documentation Interface
To interactively test all endpoints using the Swagger UI, navigate to the following URL when the server is running:
```
http://localhost:8000/api-docs
```

Swagger includes tags for **Appointment History**, **Payments - Admin**, **Clinics - Receptionist Applications**, and all new endpoints listed above. Rebuild or restart the server after code changes to refresh the spec.
