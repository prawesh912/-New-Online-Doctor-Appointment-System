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

// Public register
router.post(
    '/register',
    setUploadFolder("users"),
    uploadSingle("profile_image"),
    createUser
);

// Admin create user
router.post(
    '/admin/register',
    // verifyJWT,
    // verifyRole(ROLES.ADMIN),
    setUploadFolder("users"),
    uploadSingle("profile_image"),
    createAdminUser
);

// Get all users
router.get(
    '/',
    verifyJWT,
    verifyRole(ROLES.ADMIN),
    getAllUsers
);

// My profile
router.get(
    '/profile',
    verifyJWT,
    verifyRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PATIENT),
    getMyProfile
);

// Get user by ID
router.get(
    '/:id',
    verifyJWT,
    verifyRole(ROLES.ADMIN),
    getUserById
);

// Update user
router.put(
    '/:id',
    verifyJWT,
    verifyRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PATIENT),
    verifyOwnershipOrAdmin,
    setUploadFolder("users"),
    uploadSingle("profile_image"),
    updateUser
);

// Delete user
router.delete(
    '/:id',
    verifyJWT,
    verifyRole(ROLES.ADMIN),
    deleteUserById
);

export default router;