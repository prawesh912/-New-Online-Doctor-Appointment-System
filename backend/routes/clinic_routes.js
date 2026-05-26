import express from "express";
import {
    createClinic,
    applyToClinic,
    updateStaffStatus,
    getMyClinics,
    getClinicStaff,
    getClinicById,
    updateClinic,
    upsertClinicSchedule,
    updateClinicScheduleEntry,
    deleteClinicScheduleEntry,
    getClinicWithSchedule,
    getReceptionistApplications,
    getMyReceptionistApplications,
    addDoctorToClinic,
    getDoctorsAtClinic,
    upsertClinicPricing
} from "../controller/clinic_controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

// Doctor
router.post("/", verifyJWT, verifyRole(ROLES.DOCTOR), createClinic);
router.get("/my", verifyJWT, verifyRole(ROLES.DOCTOR), getMyClinics);
/**
 * @swagger
 * /api/clinics/applications:
 *   get:
 *     tags: [Clinics - Receptionist Applications]
 *     summary: Doctor reviews receptionist job applications (defaults to today)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: status, in: query, schema: { type: string, enum: [pending, active, rejected] } }
 *       - { name: clinic_id, in: query, schema: { type: integer } }
 *       - { name: search, in: query, schema: { type: string, description: "Search receptionist name or email" } }
 *       - { name: start_date, in: query, schema: { type: string, format: date } }
 *       - { name: end_date, in: query, schema: { type: string, format: date } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated applications }
 */
router.get("/applications", verifyJWT, verifyRole(ROLES.DOCTOR), getReceptionistApplications);

/**
 * @swagger
 * /api/clinics/add-doctor:
 *   post:
 *     tags: [Clinics]
 *     summary: Clinic owner adds a verified doctor as an associate
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clinic_id, associate_doctor_id]
 *             properties:
 *               clinic_id: { type: integer }
 *               associate_doctor_id: { type: integer }
 *     responses:
 *       200: { description: Doctor added to clinic successfully }
 */
router.post("/add-doctor", verifyJWT, verifyRole(ROLES.DOCTOR), addDoctorToClinic);

/**
 * @swagger
 * /api/clinics/{clinic_id}/all-doctors:
 *   get:
 *     tags: [Clinics]
 *     summary: Get all doctors (owner + associates) at a clinic
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Success }
 */
router.get("/:clinic_id/all-doctors", verifyJWT, verifyRole(ROLES.DOCTOR), getDoctorsAtClinic);
router.get("/:clinic_id/staff", verifyJWT, verifyRole(ROLES.DOCTOR), getClinicStaff);
/**
 * @swagger
 * /api/clinics/staff/{staff_id}:
 *   patch:
 *     tags: [Clinics - Receptionist Applications]
 *     summary: Doctor approves or rejects a receptionist application
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: staff_id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [active, rejected] }
 *     responses:
 *       200: { description: Staff status updated }
 */
router.patch("/staff/:staff_id", verifyJWT, verifyRole(ROLES.DOCTOR), updateStaffStatus);
router.put("/staff/:staff_id", verifyJWT, verifyRole(ROLES.DOCTOR), updateStaffStatus);

// Receptionist
/**
 * @swagger
 * /api/clinics/apply:
 *   post:
 *     tags: [Clinics - Receptionist Applications]
 *     summary: Receptionist applies to work at a clinic
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clinic_id]
 *             properties:
 *               clinic_id: { type: integer }
 *     responses:
 *       201: { description: Application submitted }
 *       403: { description: KYC not verified }
 */
router.post("/apply", verifyJWT, verifyRole(ROLES.RECEPTIONIST), applyToClinic);

/**
 * @swagger
 * /api/clinics/my-applications:
 *   get:
 *     tags: [Clinics - Receptionist Applications]
 *     summary: Receptionist views their own clinic applications (defaults to today)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: status, in: query, schema: { type: string, enum: [pending, active, rejected] } }
 *       - { name: search, in: query, schema: { type: string, description: "Search clinic name" } }
 *       - { name: start_date, in: query, schema: { type: string, format: date } }
 *       - { name: end_date, in: query, schema: { type: string, format: date } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated applications }
 */
router.get("/my-applications", verifyJWT, verifyRole(ROLES.RECEPTIONIST), getMyReceptionistApplications);

// Public / Shared
router.get("/:id", verifyJWT, getClinicById);

router.put("/:id", verifyJWT, verifyRole(ROLES.DOCTOR), updateClinic);

router.post(
    "/:clinic_id/schedule",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    upsertClinicSchedule
);

/**
 * @swagger
 * /api/clinics/{clinic_id}/schedule/{schedule_id}:
 *   put:
 *     tags: [Clinic Schedules]
 *     summary: Update a single clinic schedule entry
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *       - { name: schedule_id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               day_of_week: { type: string }
 *               is_closed: { type: boolean }
 *               open_time: { type: string }
 *               close_time: { type: string }
 *               break_start: { type: string }
 *               break_end: { type: string }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Clinic Schedules]
 *     summary: Delete a clinic schedule entry
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *       - { name: schedule_id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Deleted }
 */
router.put(
    "/:clinic_id/schedule/:schedule_id",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    updateClinicScheduleEntry
);
router.delete(
    "/:clinic_id/schedule/:schedule_id",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    deleteClinicScheduleEntry
);

/**
 * @swagger
 * /api/clinics/{clinic_id}/pricing:
 *   post:
 *     tags: [Clinics]
 *     summary: Set or update appointment pricing for a clinic
 *     description: Clinic owner sets the per-appointment price. Required before patients can initialize Khalti payment.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: clinic_id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [price]
 *             properties:
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 500
 *     responses:
 *       200:
 *         description: Pricing saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 clinic_id: { type: integer }
 *                 price: { type: number }
 *       400:
 *         description: Invalid price
 *       403:
 *         description: Not the clinic owner
 *       404:
 *         description: Clinic not found
 */
router.post(
    "/:clinic_id/pricing",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    upsertClinicPricing
);

router.get("/:id/full", getClinicWithSchedule);

export default router;