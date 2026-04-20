import express from "express";
import {
    createDocumentCategory,
    getAllDocumentCategories,
    getDocumentCategoryById,
    updateDocumentCategory,
    deleteDocumentCategory
} from "../controller/document_categories_controller.js";

import { verifyJWT } from "../middleware/verifyJWT.js";
import { verifyRole } from "../middleware/verifyRoles.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

// Admin only
router.post("/", verifyJWT, verifyRole(ROLES.ADMIN), createDocumentCategory);
router.put("/:id", verifyJWT, verifyRole(ROLES.ADMIN), updateDocumentCategory);
router.delete("/:id", verifyJWT, verifyRole(ROLES.ADMIN), deleteDocumentCategory);

// Authenticated users can view
router.get("/", verifyJWT, verifyRole(ROLES.ADMIN), getAllDocumentCategories);
router.get("/:id", verifyJWT, verifyRole(ROLES.DOCTOR), getDocumentCategoryById);

export default router;