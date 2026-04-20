import express from "express";
import { submitDoctorKYC, uploadDoctorDocuments, getDoctorKYCWithDocuments, resubmitDoctorKYC } from "../controller/doctors_kyc_controller.js";
import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";
import { uploadKycDocuments } from "../config/upload_image.js";

const router = express.Router();

router.post(
    "/upload-documents",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    uploadKycDocuments.array("documents", 5), // max 10 files
    uploadDoctorDocuments
);

router.post(
    "/submit",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    submitDoctorKYC
);

router.get(
    "/my-kyc",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    getDoctorKYCWithDocuments
);

router.post(
    "/resubmit",
    verifyJWT,
    verifyRole(ROLES.DOCTOR),
    resubmitDoctorKYC
);

export default router;