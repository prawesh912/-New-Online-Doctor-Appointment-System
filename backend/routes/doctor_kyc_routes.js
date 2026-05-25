import express from "express";
import { submitDoctorKYC, uploadDoctorDocuments, getDoctorKYCWithDocuments, resubmitDoctorKYC } from "../controller/doctors_kyc_controller.js";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";
import { uploadKycDocuments } from "../config/upload_image.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Doctor KYC
 *   description: Doctor KYC document upload, submission, and retrieval (Doctor only)
 */

/**
 * @swagger
 * /api/doctor-kyc/upload-documents:
 *   post:
 *     tags: [Doctor KYC]
 *     summary: Upload supporting documents for doctor KYC verification
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [document_category_id, documents]
 *             properties:
 *               document_category_id: { type: integer, example: 1 }
 *               metadata: { type: string, description: "JSON string metadata, e.g. {\"degree\":\"MBBS\",\"year\":2015}" }
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Documents uploaded and registered successfully
 *       400:
 *         description: Bad request / validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Doctor only)
 */
router.post(
    "/upload-documents",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    uploadKycDocuments.array("documents", 5), // max 10 files
    uploadDoctorDocuments
);

/**
 * @swagger
 * /api/doctor-kyc/submit:
 *   post:
 *     tags: [Doctor KYC]
 *     summary: Submit the doctor KYC application for admin review
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category_id]
 *             properties:
 *               category_id: { type: integer, example: 1 }
 *               nmc_registration_number: { type: string, example: "12345-NMC" }
 *               nmc_registration_date: { type: string, format: date, example: "2015-06-15" }
 *               council_name: { type: string, example: "Nepal Medical Council" }
 *               years_experience: { type: integer, example: 5 }
 *     responses:
 *       200:
 *         description: KYC application submitted successfully
 *       400:
 *         description: Bad request / required documents missing
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Doctor only)
 */
router.post(
    "/submit",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    submitDoctorKYC
);

/**
 * @swagger
 * /api/doctor-kyc/my-kyc:
 *   get:
 *     tags: [Doctor KYC]
 *     summary: Retrieve own KYC details including uploaded documents
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status and documents returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Doctor only)
 */
router.get(
    "/my-kyc",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    getDoctorKYCWithDocuments
);

/**
 * @swagger
 * /api/doctor-kyc/resubmit:
 *   post:
 *     tags: [Doctor KYC]
 *     summary: Resubmit a rejected KYC application back to pending
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status changed to pending successfully
 *       400:
 *         description: Bad request / not in draft or rejected status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Doctor only)
 */
router.post(
    "/resubmit",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    resubmitDoctorKYC
);

export default router;