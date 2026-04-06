import express from 'express';
import { getAllUsers, getUserById, createUser, deleteUserById } from '../controller/users_controller.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const router = express.Router();

router.post('/register', createUser);
router.get('/', verifyJWT, getAllUsers);
router.get('/:id', verifyJWT, getUserById);
router.delete('/:id', verifyJWT, deleteUserById);

export default router;