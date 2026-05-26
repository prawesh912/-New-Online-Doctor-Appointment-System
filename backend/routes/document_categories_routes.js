import express from "express";
import {
    createDocumentCategory,
    getAllDocumentCategories,
    getDocumentCategoryById,
    updateDocumentCategory,
    deleteDocumentCategory
} from "../controller/document_categories_controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Document Categories
 *   description: KYC required document categories management
 */

// Admin only
/**
 * @swagger
 * /api/document-categories:
 *   post:
 *     tags: [Document Categories]
 *     summary: Create a new document category (Admin only)
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
 *               name: { type: string, example: "Citizenship" }
 *               description: { type: string, example: "Upload front and back image of your citizenship" }
 *               min_files: { type: integer, example: 1 }
 *               max_files: { type: integer, example: 2 }
 *               requires_metadata: { type: boolean, example: false }
 *               is_required: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Document category created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.post("/", verifyJWT, verifyRole(ROLES.ADMIN), createDocumentCategory);

/**
 * @swagger
 * /api/document-categories/{id}:
 *   put:
 *     tags: [Document Categories]
 *     summary: Update an existing document category (Admin only)
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
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               min_files: { type: integer }
 *               max_files: { type: integer }
 *               requires_metadata: { type: boolean }
 *               is_required: { type: boolean }
 *     responses:
 *       200:
 *         description: Document category updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Document category not found
 */
router.put("/:id", verifyJWT, verifyRole(ROLES.ADMIN), updateDocumentCategory);

/**
 * @swagger
 * /api/document-categories/{id}:
 *   delete:
 *     tags: [Document Categories]
 *     summary: Delete a document category by ID (Admin only)
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
 *         description: Document category deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Document category not found
 */
router.delete("/:id", verifyJWT, verifyRole(ROLES.ADMIN), deleteDocumentCategory);

// Authenticated users can view
/**
 * @swagger
 * /api/document-categories:
 *   get:
 *     tags: [Document Categories]
 *     summary: Retrieve list of all document categories (Admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of document categories returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.get("/", verifyJWT, verifyRole(ROLES.ADMIN), getAllDocumentCategories);

/**
 * @swagger
 * /api/document-categories/{id}:
 *   get:
 *     tags: [Document Categories]
 *     summary: Retrieve detailed document category by ID (Doctor only)
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
 *         description: Document category details returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Doctor only)
 *       404:
 *         description: Document category not found
 */
router.get("/:id", verifyJWT, verifyRole(ROLES.DOCTOR), getDocumentCategoryById);

export default router;