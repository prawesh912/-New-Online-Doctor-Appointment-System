import express from 'express';
import { getPatients } from '../controller/patient_controller.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyRole } from '../middleware/verifyRoles.js';
import ROLES from '../constants/roles.js';

const router = express.Router();

router.get('/', verifyJWT, verifyRole(ROLES.ADMIN), getPatients);

export default router;