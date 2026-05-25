import express from "express";
import {
    getDoctorEarnings,
    getClinicRevenue
} from "../controller/earning_controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/**
 * @swagger
 * /api/earnings/doctor:
 *   get:
 *     tags: [Earnings]
 *     summary: Doctor views their own earnings (today by default, or date range)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: start_date, in: query, schema: { type: string, format: date }, description: "Defaults to today (YYYY-MM-DD)" }
 *       - { name: end_date, in: query, schema: { type: string, format: date }, description: "Defaults to today (YYYY-MM-DD)" }
 *     responses:
 *       200: { description: Success }
 *       403: { description: Not authorized }
 */
router.get("/doctor", verifyJWT, verifyRole(ROLES.DOCTOR), getDoctorEarnings);

/**
 * @swagger
 * /api/earnings/clinic/{clinic_id}:
 *   get:
 *     tags: [Earnings]
 *     summary: Clinic owner views total revenue (today by default, or date range)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *       - { name: start_date, in: query, schema: { type: string, format: date }, description: "Defaults to today" }
 *       - { name: end_date, in: query, schema: { type: string, format: date }, description: "Defaults to today" }
 *     responses:
 *       200: { description: Success }
 *       403: { description: Not authorized }
 *       404: { description: Clinic not found }
 */
router.get("/clinic/:clinic_id", verifyJWT, verifyRole(ROLES.DOCTOR), getClinicRevenue);

export default router;
