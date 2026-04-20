import express from 'express';
import { getDoctors } from '../controller/doctor_controller.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const router = express.Router();

router.get('/', verifyJWT, getDoctors);

export default router;