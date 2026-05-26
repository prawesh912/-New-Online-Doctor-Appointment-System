import express from "express";
import {
    setClinicHoliday,
    deleteClinicHoliday,
    getClinicHolidays
} from "../controller/holiday_controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/**
 * @swagger
 * /api/clinics/{clinic_id}/holidays:
 *   post:
 *     tags: [Clinic Holidays]
 *     summary: Set a holiday/closure date for a clinic
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
 *             required: [holiday_date]
 *             properties:
 *               holiday_date: { type: string, format: date, example: "2026-06-01" }
 *               reason: { type: string, example: "Public Holiday - Dashain" }
 *     responses:
 *       201: { description: Holiday scheduled successfully }
 *       400: { description: Invalid parameters or date in the past }
 *       403: { description: Not authorized }
 *       404: { description: Clinic not found }
 */
router.post("/:clinic_id/holidays", verifyJWT, verifyRole(ROLES.DOCTOR), setClinicHoliday);

/**
 * @swagger
 * /api/clinics/{clinic_id}/holidays/{hid}:
 *   delete:
 *     tags: [Clinic Holidays]
 *     summary: Delete a scheduled holiday/closure
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *       - { name: hid, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Holiday deleted successfully }
 *       403: { description: Not authorized }
 *       404: { description: Clinic or holiday not found }
 */
router.delete("/:clinic_id/holidays/:hid", verifyJWT, verifyRole(ROLES.DOCTOR), deleteClinicHoliday);

/**
 * @swagger
 * /api/clinics/{clinic_id}/holidays:
 *   get:
 *     tags: [Clinic Holidays]
 *     summary: Get scheduled holidays/closures for a clinic (public)
 *     parameters:
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *       - { name: start_date, in: query, schema: { type: string, format: date } }
 *       - { name: end_date, in: query, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: List of holidays }
 */
router.get("/:clinic_id/holidays", getClinicHolidays);

export default router;
