import { pool } from "../config/db_config.js";
import fs from "fs";
import path from "path";

export const getReceptionists = async (req, res) => {
    try {
        const { category_id, search } = req.query; // Added search to destructuring
        
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const offset = (page > 0 ? page - 1 : 0) * limit;

        let receptionistsQuery = `
            SELECT id, first_name, last_name, gender, dob_bs, dob_ad, province, 
                   district, city, ward, tole, email, phone_number, profile_image, 
                   role, category_id, is_active, email_verified, created_at
            FROM users WHERE role = 'receptionist'
        `;
        
        let countQuery = `SELECT COUNT(*) as total FROM users WHERE role = 'receptionist'`;
        let queryParams = [];

        // 1. Filter by category if provided
        if (category_id) {
            receptionistsQuery += ` AND category_id = ?`;
            countQuery += ` AND category_id = ?`;
            queryParams.push(category_id);
        }

        // 2. Search by Full Name (CONCAT) or Email
        if (search) {
            const searchTerm = `%${search}%`;
            const searchSQL = ` AND (CONCAT(first_name, ' ', last_name) LIKE ? OR email LIKE ?)`;
            
            receptionistsQuery += searchSQL;
            countQuery += searchSQL;
            
            queryParams.push(searchTerm, searchTerm);
        }

        // 3. Add Pagination
        const receptionistsParams = [...queryParams, limit, offset];
        receptionistsQuery += ` LIMIT ? OFFSET ?`;

        const [[{ total }]] = await pool.query(countQuery, queryParams);
        const [receptionists] = await pool.query(receptionistsQuery, receptionistsParams);

        const total_data = total || 0;
        const total_pages = total_data > 0 ? Math.ceil(total_data / limit) : 0;
        const current_page = total_data > 0 ? page : 0;
        const has_next_page = page < total_pages;

        return res.status(200).json({
            success: true,
            total_data,
            total_pages,
            current_page,
            has_next_page,
            count: receptionists.length,
            receptionists: receptionists
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ================= CREATE / SUBMIT KYC =================
export const submitReceptionistKYC = async (req, res) => {
    let uploadedFilePath = null;

    try {
        const userId = req.user.userId;
        const {
            citizenship_number,
            issue_date,
            issue_district
        } = req.body;

        // ---------------- VALIDATION ----------------
        if (!citizenship_number || !issue_date || !issue_district) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Citizenship image is required"
            });
        }

        uploadedFilePath = req.file.path;

        // ---------------- CHECK EXISTING ----------------
        const [existing] = await pool.query(
            `SELECT * FROM receptionist_kyc WHERE user_id = ?`,
            [userId]
        );

        if (existing.length > 0) {
            const kyc = existing[0];

            if (kyc.status === "pending") {
                return res.status(400).json({
                    success: false,
                    message: "KYC already submitted and pending review"
                });
            }

            if (kyc.status === "verified") {
                return res.status(400).json({
                    success: false,
                    message: "KYC already verified"
                });
            }

            // 🔁 RESUBMIT FLOW (REJECTED)
            if (kyc.status === "rejected") {

                // delete old image
                if (kyc.citizenship_image && fs.existsSync(kyc.citizenship_image)) {
                    fs.unlinkSync(kyc.citizenship_image);
                }

                await pool.query(
                    `UPDATE receptionist_kyc SET
                        citizenship_number = ?,
                        issue_date = ?,
                        issue_district = ?,
                        citizenship_image = ?,
                        status = 'pending',
                        reason = NULL,
                        rejected_date = NULL,
                        verified_by = NULL
                     WHERE user_id = ?`,
                    [
                        citizenship_number,
                        issue_date,
                        issue_district,
                        uploadedFilePath,
                        userId
                    ]
                );

                return res.status(200).json({
                    success: true,
                    message: "KYC resubmitted successfully"
                });
            }
        }

        // ---------------- CREATE NEW ----------------
        await pool.query(
            `INSERT INTO receptionist_kyc 
            (user_id, citizenship_number, issue_date, issue_district, citizenship_image)
            VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                citizenship_number,
                issue_date,
                issue_district,
                uploadedFilePath
            ]
        );

        return res.status(201).json({
            success: true,
            message: "KYC submitted successfully"
        });

    } catch (err) {

        // cleanup uploaded file on error
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
        }

        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// ================= GET MY KYC =================
export const getMyReceptionistKYC = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [rows] = await pool.query(
            `SELECT * FROM receptionist_kyc WHERE user_id = ?`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                userId: userId,
                message: "KYC not found"
            });
        }

        return res.status(200).json({
            success: true,
            kyc: rows[0]
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


// ================= ADMIN: GET ALL =================
export const getAllReceptionistKYC = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT rk.*, u.first_name, u.last_name, u.email
             FROM receptionist_kyc rk
             JOIN users u ON rk.user_id = u.id
             ORDER BY rk.id DESC`
        );

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


// ================= ADMIN: VERIFY =================
export const verifyReceptionistKYC = async (req, res) => {
    try {
        const adminId = req.user.userId;
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT * FROM receptionist_kyc WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KYC not found"
            });
        }

        await pool.query(
            `UPDATE receptionist_kyc SET
                status = 'verified',
                verified_by = ?,
                reason = NULL,
                rejected_date = NULL
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


// ================= ADMIN: REJECT =================
export const rejectReceptionistKYC = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required"
            });
        }

        const [rows] = await pool.query(
            `SELECT * FROM receptionist_kyc WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "KYC not found"
            });
        }

        await pool.query(
            `UPDATE receptionist_kyc SET
                status = 'rejected',
                reason = ?,
                rejected_date = NOW()
             WHERE id = ?`,
            [reason, id]
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