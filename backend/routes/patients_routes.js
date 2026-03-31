import express from 'express';
import { getAllPatients, getPatientById, createPatient, deletePatientById } from '../controller/patients_controller.js';

const router = express.Router();

router.get('/', getAllPatients);
router.get('/:id', getPatientById);
router.post('/register', createPatient);
router.delete('/:id', deletePatientById);

export default router;