import express from 'express';
import { createCategory, getAllCategories, getCategoryById, deleteCategoryById } from '../controller/categories_controller.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyRole } from '../middleware/verifyRoles.js';
import ROLES from '../constants/roles.js';

const router = express.Router();

router.post('/', verifyJWT, verifyRole(ROLES.ADMIN), createCategory);
router.get('/', verifyJWT, getAllCategories);
router.get('/:id', verifyJWT, getCategoryById);
router.delete('/:id', verifyJWT, verifyRole(ROLES.ADMIN), deleteCategoryById);

export default router;