import express from 'express';
import { loginPatient } from '../controller/auth_controller.js';

const router = express.Router();

router.post('/login', loginPatient);

export default router;