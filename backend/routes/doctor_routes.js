import express from 'express';
import { getDoctors } from '../controller/doctor_controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Doctors
 *   description: Doctor query and retrieval services
 */

/**
 * @swagger
 * /api/doctors:
 *   get:
 *     tags: [Doctors]
 *     summary: Retrieve list of verified/active doctors, optionally filtered by name or category (public)
 *     parameters:
 *       - name: search
 *         in: query
 *         description: Search by doctor's first or last name
 *         schema:
 *           type: string
 *       - name: category_id
 *         in: query
 *         description: Filter by specialization category ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of doctors returned successfully
 */
router.get('/', getDoctors);

export default router;