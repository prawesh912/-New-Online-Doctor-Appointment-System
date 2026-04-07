import express from 'express';
import { getAllUsers, getUserById, createUser, deleteUserById } from '../controller/users_controller.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyRole } from '../middleware/verifyRoles.js';
import ROLES from '../constants/roles.js';

const router = express.Router();

router.post('/register', createUser);
router.get('/', verifyJWT, verifyRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST), getAllUsers);
router.get('/:id', verifyJWT, verifyRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST), getUserById);
router.delete('/:id', verifyJWT, verifyRole(ROLES.ADMIN), deleteUserById);

export default router;