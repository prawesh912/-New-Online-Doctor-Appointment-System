import { pool } from "../config/db_config.js";
import fs from "fs";

export const submitDoctorKYC = async (req, res) => {
    try {
        const userId = req.user.userId;

        // ---------------- GET KYC ----------------
        const [kycRows] = await pool.query(
            `SELECT * FROM doctor_kyc WHERE user_id = ?`,
            [userId]
        );

        if (kycRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KYC not found"
            });
        }

        const kyc = kycRows[0];

        if (kyc.is_submitted) {
            return res.status(400).json({
                success: false,
                message: "KYC already submitted"
            });
        }

        if (kyc.status !== "draft") {
            return res.status(400).json({
                success: false,
                message: "KYC already submitted or processed"
            });
        }

        // ---------------- REQUIRED CATEGORIES ----------------
        const [requiredCategories] = await pool.query(
            `SELECT id, name, min_files 
             FROM document_categories
             WHERE is_required = TRUE AND is_active = TRUE`
        );

        // ---------------- VALIDATE EACH CATEGORY ----------------
        for (const category of requiredCategories) {

            const [docs] = await pool.query(
                `SELECT COUNT(*) as count
                 FROM doctor_documents
                 WHERE doctor_kyc_id = ? AND document_category_id = ?`,
                [kyc.id, category.id]
            );

            const uploadedCount = docs[0].count;

            if (uploadedCount < category.min_files) {
                return res.status(400).json({
                    success: false,
                    message: `Missing required documents for: ${category.name}`
                });
            }
        }

        // ---------------- UPDATE STATUS ----------------
        await pool.query(
            `UPDATE doctor_kyc 
             SET status = 'pending', is_submitted = TRUE 
             WHERE id = ?`,
            [kyc.id]
        );

        return res.status(200).json({
            success: true,
            message: "KYC submitted successfully. Awaiting verification."
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const uploadDoctorDocuments = async (req, res) => {
    let uploadedFiles = [];

    try {
        const userId = req.user.userId;
        const { document_category_id, metadata } = req.body;

        if (!document_category_id) {
            return res.status(400).json({
                success: false,
                message: "document_category_id is required"
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one file is required"
            });
        }

        // ---------------- GET KYC ----------------
        const [kycRows] = await pool.query(
            `SELECT * FROM doctor_kyc WHERE user_id = ?`,
            [userId]
        );

        if (kycRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KYC record not found"
            });
        }

        const kyc = kycRows[0];

        if (kyc.status === "pending" || kyc.status === "under_review" || kyc.status === "verified") {
            return res.status(400).json({
                success: false,
                message: "Cannot upload documents after submission"
            });
        }

        // ---------------- CATEGORY ----------------
        const [catRows] = await pool.query(
            `SELECT * FROM document_categories 
             WHERE id = ? AND is_active = TRUE`,
            [document_category_id]
        );

        if (catRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Invalid document category"
            });
        }

        const category = catRows[0];

        // ---------------- EXISTING FILE COUNT ----------------
        const [existingDocs] = await pool.query(
            `SELECT COUNT(*) as count
             FROM doctor_documents
             WHERE doctor_kyc_id = ? AND document_category_id = ?`,
            [kyc.id, document_category_id]
        );

        const existingCount = existingDocs[0].count;
        const newFilesCount = req.files.length;
        const totalFiles = existingCount + newFilesCount;

        // EXCEEDS MAX
        if (totalFiles > category.max_files) {
            // DELETE uploaded files immediately
            for (const file of req.files) {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }

            return res.status(400).json({
                success: false,
                message: `Upload limit exceeded. Max allowed is ${category.max_files}. Already uploaded: ${existingCount}`
            });
        }

        // BELOW MIN (only check when first upload)
        if (existingCount === 0 && newFilesCount < category.min_files) {
            for (const file of req.files) {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }

            return res.status(400).json({
                success: false,
                message: `Minimum ${category.min_files} files required`
            });
        }

        // ---------------- METADATA ----------------
        let parsedMetadata = null;

        if (category.requires_metadata) {
            if (!metadata) {
                return res.status(400).json({
                    success: false,
                    message: "Metadata required"
                });
            }

            try {
                parsedMetadata = typeof metadata === "string"
                    ? JSON.parse(metadata)
                    : metadata;
            } catch {
                return res.status(400).json({
                    success: false,
                    message: "Invalid metadata format"
                });
            }
        }

        // ---------------- SAVE ----------------
        const values = [];

        for (const file of req.files) {
            uploadedFiles.push(file.path);

            values.push([
                kyc.id,
                document_category_id,
                file.path,
                parsedMetadata ? JSON.stringify(parsedMetadata) : null
            ]);
        }

        await pool.query(
            `INSERT INTO doctor_documents 
            (doctor_kyc_id, document_category_id, file_path, metadata)
            VALUES ?`,
            [values]
        );

        return res.status(201).json({
            success: true,
            message: "Documents uploaded successfully",
            total_files_for_category: totalFiles
        });

    } catch (err) {
        // CLEANUP ON ERROR
        for (const filePath of uploadedFiles) {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const getDoctorKYCWithDocuments = async (req, res) => {
    try {
        const userId = req.user.userId;

        // ---------------- GET KYC ----------------
        const [kycRows] = await pool.query(
            `SELECT * FROM doctor_kyc WHERE user_id = ?`,
            [userId]
        );

        if (kycRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KYC not found"
            });
        }

        const kyc = kycRows[0];

        // ---------------- GET ALL CATEGORIES ----------------
        const [categories] = await pool.query(
            `SELECT * FROM document_categories WHERE is_active = TRUE`
        );

        // ---------------- GET DOCUMENTS ----------------
        const [documents] = await pool.query(
            `SELECT * FROM doctor_documents WHERE doctor_kyc_id = ?`,
            [kyc.id]
        );

        // ---------------- GROUP DOCUMENTS ----------------
        const grouped = {};

        for (const category of categories) {
            grouped[category.id] = {
                category_id: category.id,
                name: category.name,
                is_required: category.is_required,
                min_files: category.min_files,
                max_files: category.max_files,
                documents: []
            };
        }

        for (const doc of documents) {
            if (!grouped[doc.document_category_id]) continue;

            grouped[doc.document_category_id].documents.push({
                id: doc.id,
                file_path: doc.file_path,
                metadata: doc.metadata ? JSON.parse(doc.metadata) : null,
                created_at: doc.created_at
            });
        }

        return res.status(200).json({
            success: true,
            kyc,
            categories: Object.values(grouped)
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const resubmitDoctorKYC = async (req, res) => {
    try {
        const userId = req.user.userId;

        // ---------------- GET KYC ----------------
        const [kycRows] = await pool.query(
            `SELECT * FROM doctor_kyc WHERE user_id = ?`,
            [userId]
        );

        if (kycRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KYC not found"
            });
        }

        const kyc = kycRows[0];

        // ---------------- VALIDATION ----------------
        if (kyc.status !== "rejected") {
            return res.status(400).json({
                success: false,
                message: "Only rejected KYC can be resubmitted"
            });
        }

        // ---------------- RESET STATUS ----------------
        await pool.query(
            `UPDATE doctor_kyc
             SET status = 'draft',
                 is_submitted = FALSE,
                 rejection_reason = NULL
             WHERE id = ?`,
            [kyc.id]
        );

        // delete old documents
        const [docs] = await pool.query(
            `SELECT file_path FROM doctor_documents WHERE doctor_kyc_id = ?`,
            [kyc.id]
        );

        for (const doc of docs) {
            if (fs.existsSync(doc.file_path)) {
                fs.unlinkSync(doc.file_path);
            }
        }

        await pool.query(
            `DELETE FROM doctor_documents WHERE doctor_kyc_id = ?`,
            [kyc.id]
        );

        return res.status(200).json({
            success: true,
            message: "KYC reset to draft. You can now update and resubmit."
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

//////////////////////// ADMIN KYC VERIFICATION /////////////////////////

export const verifyDoctorKYC = async (req, res) => {
    try {
        const adminId = req.user.userId;
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT * FROM doctor_kyc WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KYC not found"
            });
        }

        const kyc = rows[0];

        // Only allow verification if submitted
        if (kyc.status !== "pending" && kyc.status !== "under_review") {
            return res.status(400).json({
                success: false,
                message: "KYC is not in a verifiable state"
            });
        }

        await pool.query(
            `UPDATE doctor_kyc 
             SET status = 'verified',
                 verified_by = ?,
                 verified_at = NOW(),
                 rejection_reason = NULL
             WHERE id = ?`,
            [adminId, id]
        );

        return res.status(200).json({
            success: true,
            message: "KYC verified successfully"
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const markKYCUnderReview = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT status FROM doctor_kyc WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KYC not found"
            });
        }

        if (rows[0].status !== "pending") {
            return res.status(400).json({
                success: false,
                message: "Only pending KYC can be reviewed"
            });
        }

        await pool.query(
            `UPDATE doctor_kyc SET status = 'under_review' WHERE id = ?`,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "KYC marked as under review"
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const rejectDoctorKYC = async (req, res) => {
    try {
        const adminId = req.user.userId;
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required"
            });
        }

        const [rows] = await pool.query(
            `SELECT * FROM doctor_kyc WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KYC not found"
            });
        }

        const kyc = rows[0];

        if (kyc.status !== "pending" && kyc.status !== "under_review") {
            return res.status(400).json({
                success: false,
                message: "KYC is not in a rejectable state"
            });
        }

        await pool.query(
            `UPDATE doctor_kyc 
             SET status = 'rejected',
                 verified_by = ?,
                 verified_at = NOW(),
                 rejection_reason = ?
             WHERE id = ?`,
            [adminId, reason, id]
        );

        return res.status(200).json({
            success: true,
            message: "KYC rejected successfully"
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getAllDoctorKYC = async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT 
                dk.id,
                dk.user_id,
                u.first_name,
                u.last_name,
                u.email,
                dk.status,
                dk.is_submitted,
                dk.created_at
            FROM doctor_kyc dk
            JOIN users u ON u.id = dk.user_id
        `;

        const params = [];

        if (status) {
            query += ` WHERE dk.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY dk.created_at DESC`;

        const [rows] = await pool.query(query, params);

        return res.status(200).json({
            success: true,
            count: rows.length,
            kyc_list: rows
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getDoctorDetailKYCById = async (req, res) => {
    try {
        const id = req.params.id;

        // ---------------- GET KYC ----------------
        const [kycRows] = await pool.query(
            `SELECT * FROM doctor_kyc WHERE id = ?`,
            [id]
        );

        if (kycRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KYC not found"
            });
        }

        const kyc = kycRows[0];

        // ---------------- GET ALL CATEGORIES ----------------
        const [categories] = await pool.query(
            `SELECT * FROM document_categories WHERE is_active = TRUE`
        );

        // ---------------- GET DOCUMENTS ----------------
        const [documents] = await pool.query(
            `SELECT * FROM doctor_documents WHERE doctor_kyc_id = ?`,
            [kyc.id]
        );

        // ---------------- GROUP DOCUMENTS ----------------
        const grouped = {};

        for (const category of categories) {
            grouped[category.id] = {
                category_id: category.id,
                name: category.name,
                is_required: category.is_required,
                min_files: category.min_files,
                max_files: category.max_files,
                documents: []
            };
        }

        for (const doc of documents) {
            if (!grouped[doc.document_category_id]) continue;

            grouped[doc.document_category_id].documents.push({
                id: doc.id,
                file_path: doc.file_path,
                metadata: doc.metadata ? JSON.parse(doc.metadata) : null,
                created_at: doc.created_at
            });
        }

        return res.status(200).json({
            success: true,
            kyc,
            categories: Object.values(grouped)
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};