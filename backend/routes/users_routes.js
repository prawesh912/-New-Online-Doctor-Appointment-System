import express from 'express';
import {
    getAllUsers,
    getUserById,
    getMyProfile,
    createUser,
    createAdminUser,
    updateUser,
    deleteUserById
} from '../controller/users_controller.js';

import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyRole } from '../middleware/verifyRoles.js';
import { verifyOwnershipOrAdmin } from "../middleware/verifyOwnershipOrAdmin.js";
import ROLES from '../constants/roles.js';

import {
    setUploadFolder,
    uploadSingle
} from '../config/upload_image.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User registration, profile management, and administration
 */

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     tags: [Users]
 *     summary: Register a new patient user
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, email, phone_number, password, gender, province, district, city, ward]
 *             properties:
 *               first_name: { type: string, example: "Radha" }
 *               last_name: { type: string, example: "Rajbanshi" }
 *               dob_bs: { type: string, format: date }
 *               dob_ad: { type: string, format: date, example: "2000-01-01" }
 *               email: { type: string, format: email, example: "radha@example.com" }
 *               phone_number: { type: string, example: "9876543103" }
 *               gender: { type: string, enum: [male, female, others], example: "female" }
 *               province: { type: string, example: "Koshi" }
 *               district: { type: string, example: "Morang" }
 *               city: { type: string, example: "Biratnagar" }
 *               ward: { type: integer, example: 10 }
 *               tole: { type: string, example: "Mahendra chowk" }
 *               password: { type: string, example: "SecurePassword123" }
 *               profile_image: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request / validation failed
 */
router.post(
    '/register',
    setUploadFolder("users"),
    uploadSingle("profile_image"),
    createUser
);

/**
 * @swagger
 * /api/users/admin/register:
 *   post:
 *     tags: [Users]
 *     summary: Create a user via Admin (or public registration with explicit role definition)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, email, phone_number, password, role, gender, province, district, city, ward]
 *             properties:
 *               first_name: { type: string, example: "Shyam" }
 *               last_name: { type: string, example: "Pradhan" }
 *               dob_bs: { type: string, format: date }
 *               dob_ad: { type: string, format: date, example: "2000-01-01" }
 *               email: { type: string, format: email, example: "shyampradhan@example.com" }
 *               phone_number: { type: string, example: "9876543104" }
 *               gender: { type: string, enum: [male, female, others], example: "male" }
 *               role: { type: string, enum: [patient, doctor, admin, receptionist], example: "doctor" }
 *               category_id: { type: integer, example: 1 }
 *               province: { type: string, example: "Koshi" }
 *               district: { type: string, example: "Morang" }
 *               city: { type: string, example: "Biratnagar" }
 *               ward: { type: integer, example: 10 }
 *               tole: { type: string, example: "Mahendra chowk" }
 *               password: { type: string, example: "SecurePassword123" }
 *               profile_image: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request / validation failed
 */
router.post(
    '/admin/register',
    // verifyJWT,
    // verifyRole(ROLES.ADMIN),
    setUploadFolder("users"),
    uploadSingle("profile_image"),
    createAdminUser
);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (Admin only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
router.get(
    '/',
    verifyJWT,
    verifyRole(ROLES.ADMIN),
    getAllUsers
);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current authenticated user's profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile details
 *       401:
 *         description: Unauthorized
 */
router.get(
    '/profile',
    verifyJWT,
    verifyRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PATIENT),
    getMyProfile
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a specific user by ID (Admin only)
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
 *         description: Detailed user information
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: User not found
 */
router.get(
    '/:id',
    verifyJWT,
    verifyRole(ROLES.ADMIN),
    getUserById
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update an existing user's information (Owner or Admin)
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               dob_bs: { type: string, format: date }
 *               dob_ad: { type: string, format: date }
 *               gender: { type: string, enum: [male, female, others] }
 *               province: { type: string }
 *               district: { type: string }
 *               city: { type: string }
 *               ward: { type: integer }
 *               tole: { type: string }
 *               phone_number: { type: string }
 *               profile_image: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: User updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Not owner or Admin)
 *       404:
 *         description: User not found
 */
router.put(
    '/:id',
    verifyJWT,
    verifyRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PATIENT),
    verifyOwnershipOrAdmin,
    setUploadFolder("users"),
    uploadSingle("profile_image"),
    updateUser
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user by ID (Admin only)
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
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: User not found
 */
router.delete(
    '/:id',
    verifyJWT,
    verifyRole(ROLES.ADMIN),
    deleteUserById
);

export default router;