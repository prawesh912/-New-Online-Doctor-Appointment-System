import { pool } from "../config/db_config.js";


// CREATE CATEGORY
export const createDocumentCategory = async (req, res) => {
    try {
        const {
            name,
            description,
            min_files,
            max_files,
            requires_metadata,
            is_required,
            is_active
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Category name is required"
            });
        }

        const min = min_files ?? 1;
        const max = max_files ?? 5;

        // VALIDATION
        if (min < 0 || max < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid file limits"
            });
        }

        if (min > max) {
            return res.status(400).json({
                success: false,
                message: "min_files cannot be greater than max_files"
            });
        }

        const [result] = await pool.query(
            `INSERT INTO document_categories 
            (name, description, min_files, max_files, requires_metadata, is_required, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                description || null,
                min,
                max,
                requires_metadata ?? false,
                is_required ?? true,
                is_active ?? true
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Document category created successfully",
            category_id: result.insertId
        });

    } catch (err) {

        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
                success: false,
                message: "Category already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


// GET ALL
export const getAllDocumentCategories = async (req, res) => {
    try {
        const [categories] = await pool.query(
            `SELECT * FROM document_categories ORDER BY id DESC`
        );

        return res.status(200).json({
            success: true,
            count: categories.length,
            categories
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


// GET BY ID
export const getDocumentCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Valid category ID is required"
            });
        }

        const [rows] = await pool.query(
            `SELECT * FROM document_categories WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        return res.status(200).json({
            success: true,
            category: rows[0]
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


// UPDATE
export const updateDocumentCategory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Valid category ID is required"
            });
        }

        const [existing] = await pool.query(
            `SELECT * FROM document_categories WHERE id = ?`,
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        const current = existing[0];

        const {
            name,
            description,
            min_files,
            max_files,
            requires_metadata,
            is_required,
            is_active
        } = req.body;

        const newMin = min_files ?? current.min_files;
        const newMax = max_files ?? current.max_files;

        // VALIDATION
        if (newMin < 0 || newMax < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid file limits"
            });
        }

        if (newMin > newMax) {
            return res.status(400).json({
                success: false,
                message: "min_files cannot be greater than max_files"
            });
        }

        await pool.query(
            `UPDATE document_categories SET
                name = ?,
                description = ?,
                min_files = ?,
                max_files = ?,
                requires_metadata = ?,
                is_required = ?,
                is_active = ?
             WHERE id = ?`,
            [
                name ?? current.name,
                description ?? current.description,
                newMin,
                newMax,
                requires_metadata ?? current.requires_metadata,
                is_required ?? current.is_required,
                is_active ?? current.is_active,
                id
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Category updated successfully"
        });

    } catch (err) {

        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
                success: false,
                message: "Category name already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


// DELETE
export const deleteDocumentCategory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Valid category ID is required"
            });
        }

        const [existing] = await pool.query(
            `SELECT id FROM document_categories WHERE id = ?`,
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        // Prevent delete if used
        const [used] = await pool.query(
            `SELECT id FROM doctor_documents WHERE document_category_id = ? LIMIT 1`,
            [id]
        );

        if (used.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete category. It is already in use."
            });
        }

        await pool.query(
            `DELETE FROM document_categories WHERE id = ?`,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully"
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};