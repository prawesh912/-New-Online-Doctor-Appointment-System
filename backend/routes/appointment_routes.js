import express from "express";
import {
    bookAppointment,
    getMyAppointments,
    cancelMyAppointment,
    getMyPaymentHistory,
    bookAppointmentByReceptionist,
    getClinicAppointments,
    confirmAppointment,
    rejectAppointment,
    getDoctorAppointments,
    doctorConfirmAppointment,
    doctorCancelAppointment,
    doctorRescheduleAppointment,
    completeAppointment,
    getClinicTokenStatus,
} from "../controller/appointment_controller.js";
import {
    getPatientAppointmentHistory,
    getDoctorAppointmentHistory,
    getReceptionistAppointmentHistory,
    getAdminAppointmentHistory,
} from "../controller/appointment_history_controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

// ── Patient ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/appointments/book:
 *   post:
 *     tags: [Patient - Appointments]
 *     summary: Book an appointment with a doctor at a clinic
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clinic_id, doctor_id, appointment_date, appointment_time]
 *             properties:
 *               clinic_id:        { type: integer }
 *               doctor_id:        { type: integer }
 *               appointment_date: { type: string, format: date, example: "2026-05-25" }
 *               appointment_time: { type: string, example: "10:00:00" }
 *               reason:           { type: string }
 *               payment_mode:
 *                 type: string
 *                 enum: [Prepayment, Pay Later]
 *                 default: Pay Later
 *               website_url:
 *                 type: string
 *                 description: Required when payment_mode is Prepayment (Khalti redirect)
 *     responses:
 *       201:
 *         description: Appointment booked. If Prepayment, includes payment_url for immediate Khalti checkout.
 *       400: { description: Validation error }
 *       409: { description: Slot already booked }
 */
router.post("/book", verifyJWT, verifyRole(ROLES.PATIENT), bookAppointment);

/**
 * @swagger
 * /api/appointments/my:
 *   get:
 *     tags: [Patient - Appointments]
 *     summary: Get patient's own appointments (paginated + filters)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: page,       in: query, schema: { type: integer } }
 *       - { name: limit,      in: query, schema: { type: integer } }
 *       - { name: status,     in: query, schema: { type: string, enum: [pending, confirmed, cancelled, completed, rescheduled, rejected] } }
 *       - { name: clinic_id,  in: query, schema: { type: integer } }
 *       - { name: start_date, in: query, schema: { type: string, format: date }, description: "Optional; omit to list all appointments" }
 *       - { name: end_date,   in: query, schema: { type: string, format: date }, description: "Optional; omit to list all appointments" }
 *     responses:
 *       200: { description: Paginated appointment list }
 */
router.get("/my", verifyJWT, verifyRole(ROLES.PATIENT), getMyAppointments);

/**
 * @swagger
 * /api/appointments/my/{id}/cancel:
 *   delete:
 *     tags: [Patient - Appointments]
 *     summary: Cancel own appointment (10% charge if < 2 hours before)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Cancelled successfully }
 *       400: { description: Cannot cancel }
 */
router.delete("/my/:id/cancel", verifyJWT, verifyRole(ROLES.PATIENT), cancelMyAppointment);

/**
 * @swagger
 * /api/appointments/my/payments:
 *   get:
 *     tags: [Patient - Payments]
 *     summary: Get patient payment history
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: page,   in: query, schema: { type: integer } }
 *       - { name: limit,  in: query, schema: { type: integer } }
 *       - { name: status, in: query, schema: { type: string } }
 *     responses:
 *       200: { description: Paginated payment history }
 */
router.get("/my/payments", verifyJWT, verifyRole(ROLES.PATIENT), getMyPaymentHistory);

// ── Appointment History ──────────────────────────────────────────────────────

/**
 * @swagger
 * /api/appointments/history/patient:
 *   get:
 *     tags: [Appointment History]
 *     summary: Patient appointment history (defaults to today)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: start_date, in: query, schema: { type: string, format: date } }
 *       - { name: end_date, in: query, schema: { type: string, format: date } }
 *       - { name: status, in: query, schema: { type: string } }
 *       - { name: clinic_id, in: query, schema: { type: integer } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated appointment history }
 */
router.get("/history/patient", verifyJWT, verifyRole(ROLES.PATIENT), getPatientAppointmentHistory);

/**
 * @swagger
 * /api/appointments/history/doctor:
 *   get:
 *     tags: [Appointment History]
 *     summary: Doctor appointment history (defaults to today, optional patient_id)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: start_date, in: query, schema: { type: string, format: date } }
 *       - { name: end_date, in: query, schema: { type: string, format: date } }
 *       - { name: patient_id, in: query, schema: { type: integer } }
 *       - { name: status, in: query, schema: { type: string } }
 *       - { name: clinic_id, in: query, schema: { type: integer } }
 *       - { name: search, in: query, schema: { type: string } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated appointment history }
 */
router.get("/history/doctor", verifyJWT, verifyRole(ROLES.DOCTOR), getDoctorAppointmentHistory);

/**
 * @swagger
 * /api/appointments/history/receptionist/{clinic_id}:
 *   get:
 *     tags: [Appointment History]
 *     summary: Receptionist clinic appointment history (defaults to today, optional patient_id)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *       - { name: start_date, in: query, schema: { type: string, format: date } }
 *       - { name: end_date, in: query, schema: { type: string, format: date } }
 *       - { name: patient_id, in: query, schema: { type: integer } }
 *       - { name: status, in: query, schema: { type: string } }
 *       - { name: doctor_id, in: query, schema: { type: integer } }
 *       - { name: search, in: query, schema: { type: string } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated appointment history }
 */
router.get("/history/receptionist/:clinic_id", verifyJWT, verifyRole(ROLES.RECEPTIONIST), getReceptionistAppointmentHistory);

/**
 * @swagger
 * /api/appointments/history/admin:
 *   get:
 *     tags: [Appointment History]
 *     summary: Admin views all appointment history (defaults to today)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: start_date, in: query, schema: { type: string, format: date } }
 *       - { name: end_date, in: query, schema: { type: string, format: date } }
 *       - { name: patient_id, in: query, schema: { type: integer } }
 *       - { name: doctor_id, in: query, schema: { type: integer } }
 *       - { name: clinic_id, in: query, schema: { type: integer } }
 *       - { name: status, in: query, schema: { type: string } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated appointment history }
 */
router.get("/history/admin", verifyJWT, verifyRole(ROLES.ADMIN), getAdminAppointmentHistory);

/**
 * @swagger
 * /api/appointments/complete/{id}:
 *   patch:
 *     tags: [Appointments]
 *     summary: Mark appointment status as completed with clinical notes
 *     description: Sets appointments.status to completed. Doctor assigned to the appointment or active receptionist at the clinic.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [note]
 *             properties:
 *               note: { type: string, description: Appointment completion notes }
 *     responses:
 *       200: { description: Appointment status set to completed }
 *       400: { description: Invalid status or missing note }
 */
router.patch("/complete/:id", verifyJWT, verifyRole(ROLES.DOCTOR, ROLES.RECEPTIONIST), completeAppointment);
router.put("/complete/:id", verifyJWT, verifyRole(ROLES.DOCTOR, ROLES.RECEPTIONIST), completeAppointment);

// ── Receptionist ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/appointments/receptionist/book:
 *   post:
 *     tags: [Receptionist - Appointments]
 *     summary: Receptionist books an appointment on behalf of a patient
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clinic_id, doctor_id, patient_id, appointment_date, appointment_time]
 *             properties:
 *               clinic_id:        { type: integer }
 *               doctor_id:        { type: integer }
 *               patient_id:       { type: integer }
 *               appointment_date: { type: string, format: date }
 *               appointment_time: { type: string }
 *               reason:           { type: string }
 *     responses:
 *       201: { description: Appointment booked }
 */
router.post("/receptionist/book", verifyJWT, verifyRole(ROLES.RECEPTIONIST), bookAppointmentByReceptionist);

/**
 * @swagger
 * /api/appointments/clinic/{clinic_id}:
 *   get:
 *     tags: [Receptionist - Appointments]
 *     summary: Get appointments for a clinic (paginated + filters)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *       - { name: page,       in: query, schema: { type: integer } }
 *       - { name: limit,      in: query, schema: { type: integer } }
 *       - { name: status,     in: query, schema: { type: string } }
 *       - { name: doctor_id,  in: query, schema: { type: integer } }
 *       - { name: search,     in: query, schema: { type: string } }
 *       - { name: start_date, in: query, schema: { type: string, format: date } }
 *       - { name: end_date,   in: query, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: Paginated appointment list }
 */
router.get("/clinic/:clinic_id", verifyJWT, verifyRole(ROLES.RECEPTIONIST), getClinicAppointments);

/**
 * @swagger
 * /api/appointments/confirm/{id}:
 *   put:
 *     tags: [Receptionist - Appointments]
 *     summary: Confirm an appointment
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Confirmed }
 */
router.put("/confirm/:id", verifyJWT, verifyRole(ROLES.RECEPTIONIST), confirmAppointment);

/**
 * @swagger
 * /api/appointments/reject/{id}:
 *   put:
 *     tags: [Receptionist - Appointments]
 *     summary: Reject an appointment with reason
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Rejected }
 */
router.put("/reject/:id", verifyJWT, verifyRole(ROLES.RECEPTIONIST), rejectAppointment);

// ── Doctor ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/appointments/doctor:
 *   get:
 *     tags: [Doctor - Appointments]
 *     summary: Get doctor's appointments (today by default, or date range)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: start_date, in: query, schema: { type: string, format: date }, description: "Defaults to today" }
 *       - { name: end_date,   in: query, schema: { type: string, format: date }, description: "Defaults to today" }
 *       - { name: page,       in: query, schema: { type: integer } }
 *       - { name: limit,      in: query, schema: { type: integer } }
 *       - { name: status,     in: query, schema: { type: string } }
 *       - { name: clinic_id,  in: query, schema: { type: integer } }
 *       - { name: search,     in: query, schema: { type: string } }
 *     responses:
 *       200: { description: Paginated appointment list }
 */
router.get("/doctor", verifyJWT, verifyRole(ROLES.DOCTOR), getDoctorAppointments);

/**
 * @swagger
 * /api/appointments/doctor/confirm/{id}:
 *   patch:
 *     tags: [Doctor - Appointments]
 *     summary: Doctor confirms an appointment
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Confirmed }
 */
router.patch("/doctor/confirm/:id", verifyJWT, verifyRole(ROLES.DOCTOR), doctorConfirmAppointment);

/**
 * @swagger
 * /api/appointments/doctor/cancel/{id}:
 *   patch:
 *     tags: [Doctor - Appointments]
 *     summary: Doctor cancels an appointment with reason
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Cancelled }
 */
router.patch("/doctor/cancel/:id", verifyJWT, verifyRole(ROLES.DOCTOR), doctorCancelAppointment);

/**
 * @swagger
 * /api/appointments/doctor/reschedule/{id}:
 *   patch:
 *     tags: [Doctor - Appointments]
 *     summary: Doctor reschedules an appointment
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             required: [new_date, new_time, reason]
 *             properties:
 *               new_date: { type: string, format: date }
 *               new_time: { type: string, example: "11:00:00" }
 *               reason:   { type: string }
 *     responses:
 *       200: { description: Rescheduled }
 */
router.patch("/doctor/reschedule/:id", verifyJWT, verifyRole(ROLES.DOCTOR), doctorRescheduleAppointment);

// ── Token Status ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/appointments/token-status/{clinic_id}:
 *   get:
 *     tags: [Patient - Appointments]
 *     summary: Live token status for patient (must have appointment today)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Token status
 *         content:
 *           application/json:
 *             schema:
 *               properties:
 *                 current_token:       { type: string }
 *                 your_token:          { type: string }
 *                 appointments_ahead:  { type: integer }
 */
router.get("/token-status/:clinic_id", verifyJWT, verifyRole(ROLES.PATIENT), getClinicTokenStatus);

export default router;