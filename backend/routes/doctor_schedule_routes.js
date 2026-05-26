import express from "express";
import {
    upsertDoctorSchedule,
    updateDoctorScheduleEntry,
    deleteDoctorScheduleEntry,
    getDoctorScheduleAtClinic,
    getDoctorAvailableSlots
} from "../controller/doctor_schedule_controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/**
 * @swagger
 * /api/doctor-schedule/{clinic_id}/schedule:
 *   post:
 *     tags: [Doctor Schedules]
 *     summary: Upsert doctor's weekly schedules at a clinic
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [schedules]
 *             properties:
 *               schedules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [day_of_week, start_time, end_time]
 *                   properties:
 *                     day_of_week: { type: string, enum: [sunday, monday, tuesday, wednesday, thursday, friday, saturday] }
 *                     is_available: { type: boolean, default: true }
 *                     start_time: { type: string, example: "09:00:00" }
 *                     end_time: { type: string, example: "17:00:00" }
 *                     break_start: { type: string, example: "12:00:00" }
 *                     break_end: { type: string, example: "13:00:00" }
 *                     slot_duration_minutes: { type: integer, default: 15 }
 *     responses:
 *       200: { description: Doctor schedule updated successfully }
 *       400: { description: Invalid parameters }
 *       403: { description: Not authorized }
 *       404: { description: Clinic not found }
 */
router.post("/:clinic_id/schedule", verifyJWT, verifyRole(ROLES.DOCTOR), upsertDoctorSchedule);

/**
 * @swagger
 * /api/doctor-schedule/{clinic_id}/schedule/{schedule_id}:
 *   put:
 *     tags: [Doctor Schedules]
 *     summary: Update a single doctor schedule entry at a clinic
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
 *               is_available: { type: boolean }
 *               start_time: { type: string }
 *               end_time: { type: string }
 *               break_start: { type: string }
 *               break_end: { type: string }
 *               slot_duration_minutes: { type: integer }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Doctor Schedules]
 *     summary: Delete a doctor schedule entry
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
    updateDoctorScheduleEntry
);
router.delete(
    "/:clinic_id/schedule/:schedule_id",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    deleteDoctorScheduleEntry
);

/**
 * @swagger
 * /api/doctor-schedule/{doctor_id}/{clinic_id}:
 *   get:
 *     tags: [Doctor Schedules]
 *     summary: Get doctor's weekly schedules and upcoming holidays at a clinic (public)
 *     parameters:
 *       - { name: doctor_id, in: path, required: true, schema: { type: integer } }
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Weekly schedules and holidays }
 */
router.get("/:doctor_id/:clinic_id", getDoctorScheduleAtClinic);

/**
 * @swagger
 * /api/doctor-schedule/{doctor_id}/{clinic_id}/available-slots:
 *   get:
 *     tags: [Doctor Schedules]
 *     summary: Get doctor's available slots for today and tomorrow at a clinic (public)
 *     parameters:
 *       - { name: doctor_id, in: path, required: true, schema: { type: integer } }
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Available slots grouped by today and tomorrow, or a meaningful error message
 */
router.get("/:doctor_id/:clinic_id/available-slots", getDoctorAvailableSlots);

export default router;
