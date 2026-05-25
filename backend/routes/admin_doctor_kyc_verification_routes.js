import express from "express";
import {
    verifyDoctorKYC,
    rejectDoctorKYC,
    getAllDoctorKYC,
    getDoctorDetailKYCById,
    markKYCUnderReview
} from "../controller/doctors_kyc_controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin Doctor KYC
 *   description: Administrative dashboard to manage doctor KYC verification applications (Admin only)
 */

// Admin routes
/**
 * @swagger
 * /api/admin-doctor-kyc:
 *   get:
 *     tags: [Admin Doctor KYC]
 *     summary: Retrieve list of all doctor KYC applications, filtered by status (Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         description: Filter by status
 *         schema:
 *           type: string
 *           enum: [draft, pending, under_review, verified, rejected]
 *     responses:
 *       200:
 *         description: List of doctor KYC records returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.get("/", verifyJWT, verifyRole(ROLES.ADMIN), getAllDoctorKYC);

/**
 * @swagger
 * /api/admin-doctor-kyc/{id}:
 *   get:
 *     tags: [Admin Doctor KYC]
 *     summary: Retrieve detailed doctor KYC profile and uploaded files by ID (Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detailed KYC record returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Record not found
 */
router.get("/:id", verifyJWT, verifyRole(ROLES.ADMIN), getDoctorDetailKYCById);

/**
 * @swagger
 * /api/admin-doctor-kyc/{id}/verify:
 *   put:
 *     tags: [Admin Doctor KYC]
 *     summary: Verify doctor's KYC and approve their credentials (Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Doctor KYC verified successfully, doctor active
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Record not found
 */
router.put("/:id/verify", verifyJWT, verifyRole(ROLES.ADMIN), verifyDoctorKYC);

/**
 * @swagger
 * /api/admin-doctor-kyc/{id}/reject:
 *   put:
 *     tags: [Admin Doctor KYC]
 *     summary: Reject doctor's KYC and record the reason (Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: "Medical license certificate is blurry or expired" }
 *     responses:
 *       200:
 *         description: Doctor KYC rejected successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Record not found
 */
router.put("/:id/reject", verifyJWT, verifyRole(ROLES.ADMIN), rejectDoctorKYC);

/**
 * @swagger
 * /api/admin-doctor-kyc/{id}/review:
 *   put:
 *     tags: [Admin Doctor KYC]
 *     summary: Mark a doctor's KYC application as 'under_review' (Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: KYC status updated to under_review successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Record not found
 */
router.put("/:id/review", verifyJWT, verifyRole(ROLES.ADMIN), markKYCUnderReview);

export default router;