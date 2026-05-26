import express from 'express';
import { getPatients } from '../controller/patient_controller.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyRole } from '../middleware/verifyRoles.js';
import ROLES from '../constants/roles.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Patients
 *   description: Patient query services
 */

/**
 * @swagger
 * /api/patients:
 *   get:
 *     tags: [Patients]
 *     summary: Retrieve list of all patients (Admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of patients returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.get('/', verifyJWT, verifyRole(ROLES.ADMIN), getPatients);

export default router;