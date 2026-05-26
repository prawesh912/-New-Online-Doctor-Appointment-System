import express from 'express';
import { createCategory, getAllCategories, getCategoryById, deleteCategoryById } from '../controller/categories_controller.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyRole } from '../middleware/verifyRoles.js';
import ROLES from '../constants/roles.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Doctor specialization categories management
 */

/**
 * @swagger
 * /api/category:
 *   post:
 *     tags: [Categories]
 *     summary: Create a new doctor specialization category (Admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "General Physician" }
 *               description: { type: string, example: "Routine checkups, fever, minor illnesses" }
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Bad request / category name already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.post('/', verifyJWT, verifyRole(ROLES.ADMIN), createCategory);

/**
 * @swagger
 * /api/category:
 *   get:
 *     tags: [Categories]
 *     summary: Get all specialization categories
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all categories
 *       401:
 *         description: Unauthorized
 */
router.get('/', verifyJWT, getAllCategories);

/**
 * @swagger
 * /api/category/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get category by ID
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
 *         description: Specialization category details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.get('/:id', verifyJWT, getCategoryById);

/**
 * @swagger
 * /api/category/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category by ID (Admin only)
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
 *         description: Category deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Category not found
 */
router.delete('/:id', verifyJWT, verifyRole(ROLES.ADMIN), deleteCategoryById);

export default router;