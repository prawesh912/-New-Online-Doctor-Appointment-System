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

router.get('/all', verifyJWT, verifyRole(ROLES.ADMIN), getReceptionists);

// Submit / Resubmit KYC
router.post(
    "/submit",
    verifyJWT,
    verifyRole(ROLES.RECEPTIONIST),
    uploadSingle("citizenship_image"),
    submitReceptionistKYC
);

// Get own KYC
router.get(
    "/my-kyc",
    verifyJWT,
    verifyRole(ROLES.RECEPTIONIST),
    getMyReceptionistKYC
);


// ================= ADMIN =================

// Get all KYC
router.get(
    "/",
    verifyJWT,
    verifyRole(ROLES.ADMIN),
    getAllReceptionistKYC
);

// Verify
router.put(
    "/verify/:id",
    verifyJWT,
    verifyRole(ROLES.ADMIN),
    verifyReceptionistKYC
);

// Reject
router.put(
    "/reject/:id",
    verifyJWT,
    verifyRole(ROLES.ADMIN),
    rejectReceptionistKYC
);

export default router;