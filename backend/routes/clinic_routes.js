import express from "express";
import {
    createClinic,
    applyToClinic,
    updateStaffStatus,
    getMyClinics,
    getClinicStaff,
    getClinicById,
    updateClinic,
    upsertClinicSchedule,
    getClinicWithSchedule
} from "../controller/clinic_controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

// Doctor
router.post("/", verifyJWT, verifyRole(ROLES.DOCTOR), createClinic);
router.get("/my", verifyJWT, verifyRole(ROLES.DOCTOR), getMyClinics);
router.get("/:clinic_id/staff", verifyJWT, verifyRole(ROLES.DOCTOR), getClinicStaff);
router.patch("/staff/:staff_id", verifyJWT, verifyRole(ROLES.DOCTOR), updateStaffStatus);

// Receptionist
router.post("/apply", verifyJWT, verifyRole(ROLES.RECEPTIONIST), applyToClinic);

// Public / Shared
router.get("/:id", verifyJWT, getClinicById);

router.put("/:id", verifyJWT, verifyRole(ROLES.DOCTOR), updateClinic);

router.post(
    "/:clinic_id/schedule",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    upsertClinicSchedule
);

router.get("/:id/full", getClinicWithSchedule);

export default router;