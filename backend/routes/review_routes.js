import express from "express";
import {
    submitClinicReview,
    submitDoctorReview,
    getMyReviews,
    getClinicReviewsList,
    getDoctorReviewsList
} from "../controller/review_controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/**
 * @swagger
 * /api/reviews/clinic:
 *   post:
 *     tags: [Reviews]
 *     summary: Patient submits review for a clinic
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clinic_id, appointment_id, rating]
 *             properties:
 *               clinic_id: { type: integer }
 *               appointment_id: { type: integer }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               review: { type: string }
 *     responses:
 *       201: { description: Clinic review submitted successfully }
 *       400: { description: Invalid parameters or appointment not completed }
 *       403: { description: Not authorized }
 *       409: { description: Duplicate review }
 */
router.post("/clinic", verifyJWT, verifyRole(ROLES.PATIENT), submitClinicReview);

/**
 * @swagger
 * /api/reviews/doctor:
 *   post:
 *     tags: [Reviews]
 *     summary: Patient submits review for a doctor
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctor_id, appointment_id, clinic_id, rating]
 *             properties:
 *               doctor_id: { type: integer }
 *               appointment_id: { type: integer }
 *               clinic_id: { type: integer }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               review: { type: string }
 *     responses:
 *       201: { description: Doctor review submitted successfully }
 *       400: { description: Invalid parameters or appointment not completed }
 *       403: { description: Not authorized }
 *       409: { description: Duplicate review }
 */
router.post("/doctor", verifyJWT, verifyRole(ROLES.PATIENT), submitDoctorReview);

/**
 * @swagger
 * /api/reviews/my:
 *   get:
 *     tags: [Reviews]
 *     summary: Patient gets all reviews submitted by them (paginated)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: Success }
 */
router.get("/my", verifyJWT, verifyRole(ROLES.PATIENT), getMyReviews);

/**
 * @swagger
 * /api/reviews/clinic/{clinic_id}:
 *   get:
 *     tags: [Reviews]
 *     summary: Get clinic reviews (public, paginated)
 *     parameters:
 *       - { name: clinic_id, in: path, required: true, schema: { type: integer } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: Success }
 */
router.get("/clinic/:clinic_id", getClinicReviewsList);

/**
 * @swagger
 * /api/reviews/doctor/{doctor_id}:
 *   get:
 *     tags: [Reviews]
 *     summary: Get doctor reviews (public, paginated)
 *     parameters:
 *       - { name: doctor_id, in: path, required: true, schema: { type: integer } }
 *       - { name: page, in: query, schema: { type: integer } }
 *       - { name: limit, in: query, schema: { type: integer } }
 *     responses:
 *       200: { description: Success }
 */
router.get("/doctor/:doctor_id", getDoctorReviewsList);

export default router;
