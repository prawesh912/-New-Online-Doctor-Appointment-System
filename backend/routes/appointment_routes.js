import express from "express";
import {
    bookAppointment,
    getClinicAppointments,
    confirmAppointment,
    rejectAppointment,
    getDoctorAppointments,
    getMyAppointments
} from "../controller/appointment_controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

// Patient
router.post(
    "/book",
    verifyJWT,
    verifyRole(ROLES.PATIENT),
    bookAppointment
);

router.get(
    "/my",
    verifyJWT,
    verifyRole(ROLES.PATIENT),
    getMyAppointments
);

// Receptionist
router.get(
    "/clinic/:clinic_id",
    verifyJWT,
    verifyRole(ROLES.RECEPTIONIST),
    getClinicAppointments
);

router.put(
    "/confirm/:id",
    verifyJWT,
    verifyRole(ROLES.RECEPTIONIST),
    confirmAppointment
);

router.put(
    "/reject/:id",
    verifyJWT,
    verifyRole(ROLES.RECEPTIONIST),
    rejectAppointment
);

// Doctor
router.get(
    "/doctor",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    getDoctorAppointments
);

export default router;