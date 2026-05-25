import express from 'express';
import {
    getReceptionists, submitReceptionistKYC,
    getMyReceptionistKYC,
    getAllReceptionistKYC,
    verifyReceptionistKYC,
    rejectReceptionistKYC
} from '../controller/receptionist_controller.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyRole } from '../middleware/verifyRoles.js';
import ROLES from '../constants/roles.js';
import { uploadSingle } from '../config/upload_image.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Receptionists
 *   description: Receptionist retrieval, KYC submission, verification, and rejection
 */

/**
 * @swagger
 * /api/receptionists/all:
 *   get:
 *     tags: [Receptionists]
 *     summary: Retrieve list of all receptionists (Admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of receptionists returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.get('/all', verifyJWT, verifyRole(ROLES.ADMIN), getReceptionists);

/**
 * @swagger
 * /api/receptionists/submit:
 *   post:
 *     tags: [Receptionists]
 *     summary: Submit or resubmit receptionist KYC verification details (Receptionist only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [citizenship_number, issue_date, issue_district, citizenship_image]
 *             properties:
 *               citizenship_number: { type: string, example: "07-331-123456" }
 *               issue_date: { type: string, format: date, example: "2020-10-01" }
 *               issue_district: { type: string, example: "Morang" }
 *               citizenship_image: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: KYC submitted successfully
 *       400:
 *         description: Bad request / validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Receptionist only)
 */
router.post(
    "/submit",
    verifyJWT,
    verifyRole(ROLES.RECEPTIONIST),
    uploadSingle("citizenship_image"),
    submitReceptionistKYC
);

/**
 * @swagger
 * /api/receptionists/my-kyc:
 *   get:
 *     tags: [Receptionists]
 *     summary: Get own receptionist KYC details (Receptionist only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: KYC details returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Receptionist only)
 */
router.get(
    "/my-kyc",
    verifyJWT,
    verifyRole(ROLES.RECEPTIONIST),
    getMyReceptionistKYC
);


// ================= ADMIN =================

/**
 * @swagger
 * /api/receptionists:
 *   get:
 *     tags: [Receptionists]
 *     summary: Get all receptionist KYC applications (Admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of receptionist KYC applications
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.get(
    "/",
    verifyJWT,
    verifyRole(ROLES.ADMIN),
    getAllReceptionistKYC
);

/**
 * @swagger
 * /api/receptionists/verify/{id}:
 *   put:
 *     tags: [Receptionists]
 *     summary: Verify a receptionist's KYC application (Admin only)
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
 *         description: KYC application verified successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: KYC record not found
 */
router.put(
    "/verify/:id",
    verifyJWT,
    verifyRole(ROLES.ADMIN),
    verifyReceptionistKYC
);

/**
 * @swagger
 * /api/receptionists/reject/{id}:
 *   put:
 *     tags: [Receptionists]
 *     summary: Reject a receptionist's KYC application (Admin only)
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
 *               reason: { type: string, example: "Documents not clear" }
 *     responses:
 *       200:
 *         description: KYC application rejected successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: KYC record not found
 */
router.put(
    "/reject/:id",
    verifyJWT,
    verifyRole(ROLES.ADMIN),
    rejectReceptionistKYC
);

export default router;