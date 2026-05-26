import express from "express";
import {
    searchClinics,
    getClinicSchedulePublic,
    getDoctorsInClinic
} from "../controller/clinic_search_controller.js";
import { getClinicTokenStatus } from "../controller/appointment_controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/**
 * @swagger
 * /api/clinics/search:
 *   get:
 *     tags: [Clinics Search]
 *     summary: Search clinics with filters and pagination
 *     parameters:
 *       - { name: province, in: query, schema: { type: string } }
 *       - { name: district, in: query, schema: { type: string } }
 *       - { name: city, in: query, schema: { type: string } }
 *       - { name: ward, in: query, schema: { type: integer } }
 *       - { name: name, in: query, schema: { type: string } }
 *       - { name: min_rating, in: query, schema: { type: number } }
 *       - { name: max_rating, in: query, schema: { type: number } }
 *       - { name: category_id, in: query, schema: { type: integer } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: Success }
 */
router.get("/search", searchClinics);

/**
 * @swagger
 * /api/clinics/{id}/schedule:
 *   get:
 *     tags: [Clinics Search]
 *     summary: Get weekly schedule and upcoming holidays of a clinic (public)
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Success }
 *       404: { description: Clinic not found }
 */
router.get("/:id/schedule", getClinicSchedulePublic);

/**
 * @swagger
 * /api/clinics/{id}/doctors:
 *   get:
 *     tags: [Clinics Search]
 *     summary: Get all doctors working at a clinic (public)
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Success }
 *       404: { description: Clinic not found }
 */
router.get("/:id/doctors", getDoctorsInClinic);

/**
 * @swagger
 * /api/clinics/{clinic_id}/token-status:
 *   get:
 *     tags: [Clinics Search]
 *     summary: Live token status for patient
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Success }
 *       403: { description: Forbidden }
 */
router.get("/:clinic_id/token-status", verifyJWT, verifyRole(ROLES.PATIENT), getClinicTokenStatus);

export default router;
