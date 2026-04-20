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

// Admin routes
router.get("/", verifyJWT, verifyRole(ROLES.ADMIN), getAllDoctorKYC);
router.get("/:id", verifyJWT, verifyRole(ROLES.ADMIN), getDoctorDetailKYCById);

router.put("/:id/verify", verifyJWT, verifyRole(ROLES.ADMIN), verifyDoctorKYC);

router.put("/:id/reject", verifyJWT, verifyRole(ROLES.ADMIN), rejectDoctorKYC);

router.put("/:id/review", verifyJWT, verifyRole(ROLES.ADMIN), markKYCUnderReview);

export default router;