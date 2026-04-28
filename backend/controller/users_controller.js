import { pool } from '../config/db_config.js';
import ROLES from '../constants/roles.js';
import bcrypt from "bcrypt";
import { uploadSingle } from '../config/upload_image.js';
import fs from 'fs/promises';
import path from 'path';
import { processAndSaveImage } from "../utils/imageProcessor.js";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

export const getAllUsers = async (req, res) => {
    try {
        const { search } = req.query; // Destructure search from query
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const offset = (page > 0 ? page - 1 : 0) * limit;

        // 1. Initialize Base Queries
        let usersQuery = `
            SELECT 
                id, first_name, last_name, gender, dob_bs, dob_ad, 
                province, district, city, ward, tole, email, 
                phone_number, profile_image, role, category_id, 
                is_active, email_verified, created_at
             FROM users
        `;
        let countQuery = `SELECT COUNT(*) as total FROM users`;
        let queryParams = [];

        // 2. Add Search Filter if present
        if (search) {
            const searchTerm = `%${search}%`;
            const searchSQL = ` WHERE (CONCAT(first_name, ' ', last_name) LIKE ? OR email LIKE ?)`;
            
            usersQuery += searchSQL;
            countQuery += searchSQL;
            
            queryParams.push(searchTerm, searchTerm);
        }

        // 3. Add Pagination and execute
        const usersParams = [...queryParams, limit, offset];
        usersQuery += ` LIMIT ? OFFSET ?`;

        const [[{ total }]] = await pool.query(countQuery, queryParams);
        const [users] = await pool.query(usersQuery, usersParams);

        // 4. Metadata calculations
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
            count: users.length,
            users: users
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const [user] = await pool.query(
            `SELECT 
                id,
                first_name,
                last_name,
                gender,
                dob_bs,
                dob_ad,
                province,
                district,
                city,
                ward,
                tole,
                email,
                phone_number,
                profile_image,
                role,
                category_id,
                is_active,
                email_verified,
                created_at
             FROM users 
             WHERE id = ?`,
            [id]
        );

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: user[0]
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getMyProfile = async (req, res) => {
    try {
        const id = req.user.userId;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const [user] = await pool.query(
            `SELECT 
                id,
                first_name,
                last_name,
                gender,
                dob_bs,
                dob_ad,
                province,
                district,
                city,
                ward,
                tole,
                email,
                phone_number,
                profile_image,
                role,
                category_id,
                is_active,
                email_verified,
                created_at
             FROM users 
             WHERE id = ?`,
            [id]
        );

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: user[0]
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const createUser = async (req, res) => {
    let uploadedTempPath = null;
    let finalImagePath = null;

    try {
        const {
            first_name, last_name, gender,
            dob_bs, dob_ad,
            province, district, city, ward, tole,
            email, phone_number,
            password, confirm_password,
            role, category_id
        } = req.body;

        // VALIDATION
        if (!first_name || !last_name || !gender || !province || !district || !city || !ward || !email || !phone_number || !password || !confirm_password)
            return res.status(400).json({ success: false, message: "All required fields must be provided" });

        if (!dob_bs && !dob_ad)
            return res.status(400).json({ success: false, message: "DOB required" });

        if (!Object.values(ROLES).includes(role))
            return res.status(400).json({ success: false, message: "Invalid role" });

        if (role === ROLES.ADMIN)
            return res.status(403).json({ success: false, message: "Admin cannot self-register" });

        if (role === ROLES.DOCTOR && !category_id)
            return res.status(400).json({ success: false, message: "Category required for doctor" });

        if(role === ROLES.DOCTOR){
            const [category] = await pool.query(
            `SELECT * FROM categories WHERE id = ?`, [category_id]
            );

            if(category.length == 0) return res.status(404).json({success: false, message: "Category Id not found", category: category[0]});
        }

        if (password !== confirm_password)
            return res.status(400).json({ success: false, message: "Passwords do not match" });

        
        // DUPLICATE CHECK
        const [existing] = await pool.query(
            "SELECT email, phone_number FROM users WHERE email = ? OR phone_number = ?",
            [email, phone_number]
        );
        
        if (existing.length)
            return res.status(400).json({
        success: false,
        message: "Email or phone already exists"
        });
    
        // generate token
        const token = crypto.randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

        // IMAGE
        let profile_image = null;

        if (req.file) {
            uploadedTempPath = req.file.path;

            const fileName = `${Date.now()}.jpeg`;
            const outputDir = path.join("uploads", req.uploadFolder || "users");

            await fs.mkdir(outputDir, { recursive: true });

            finalImagePath = path.join(outputDir, fileName);

            await processAndSaveImage(uploadedTempPath, finalImagePath);

            profile_image = finalImagePath;
        }

        // PASSWORD
        const hashedPassword = await bcrypt.hash(password, 10);

        // INSERT
        const [result] = await pool.query(
            `INSERT INTO users 
            (first_name,last_name,gender,dob_bs,dob_ad,province,district,city,ward,tole,email,phone_number,profile_image,role,category_id,password,emailVerificationToken,emailVerificationExpires)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                first_name, last_name, gender,
                dob_bs, dob_ad,
                province, district, city, ward, tole,
                email, phone_number,
                profile_image,
                role, category_id,
                hashedPassword,
                token, expiry
            ]
        );

        const verifyLink = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;

        if (role === ROLES.DOCTOR) {
            await pool.query(
                `INSERT INTO doctor_kyc (user_id, category_id) VALUES (?, ?)`,
                [result.insertId, category_id]
            );
        }

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user_id: result.insertId
        });

        // send email AFTER response (non-blocking)
        sendEmail(
        email,
        "Verify your email",
                `<h3>Email Verification</h3>
                <p>Click below to verify:</p>
                <a href="${verifyLink}">${verifyLink}</a>`
            ).catch(err => {
            console.error("Email failed:", err.message);
        });

    } catch (err) {

        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
                success: false,
                message: "Email or phone already exists"
            });
        }

        return res.status(500).json({ success: false, message: err.message });

    } finally {
        if (uploadedTempPath) {
            try { await fs.unlink(uploadedTempPath); } catch {}
        }
    }
};

export const createAdminUser = async (req, res) => {
    let uploadedTempPath = null;
    let finalImagePath = null;

    try {
        const {
            first_name, last_name, gender,
            dob_bs, dob_ad,
            province, district, city, ward, tole,
            email, phone_number,
            password, confirm_password,
            role, category_id
        } = req.body;

        if (!first_name || !last_name || !gender || !province || !district || !city || !ward || !email || !phone_number || !password || !confirm_password) {
            return res.status(400).json({ success: false, message: "All required fields must be provided" });
        }

        if (!Object.values(ROLES).includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }

        if (password !== confirm_password) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }

        // generate token
        const token = crypto.randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

        // IMAGE
        let profile_image = null;

        if (req.file) {
            uploadedTempPath = req.file.path;

            const fileName = `${Date.now()}.jpeg`;
            const outputDir = path.join("uploads", req.uploadFolder || "users");

            await fs.mkdir(outputDir, { recursive: true });

            finalImagePath = path.join(outputDir, fileName);

            await processAndSaveImage(uploadedTempPath, finalImagePath);

            profile_image = finalImagePath;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `INSERT INTO users 
            (first_name,last_name,gender,dob_bs,dob_ad,province,district,city,ward,tole,email,phone_number,profile_image,role,category_id,password)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                first_name, last_name, gender,
                dob_bs, dob_ad,
                province, district, city, ward, tole,
                email, phone_number,
                profile_image,
                role, category_id,
                hashedPassword
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Admin created user successfully",
            user_id: result.insertId
        });

        const verifyLink = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;

        // send email AFTER response (non-blocking)
        sendEmail(
        email,
        "Verify your email",
                `<h3>Email Verification</h3>
                <p>Click below to verify:</p>
                <a href="${verifyLink}">${verifyLink}</a>`
            ).catch(err => {
            console.error("Email failed:", err.message);
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });

    } finally {
        if (uploadedTempPath) {
            try { await fs.unlink(uploadedTempPath); } catch {}
        }
    }
};

export const updateUser = async (req, res) => {
    let uploadedTempPath = null;
    let newImagePath = null;

    try {
        const userId = req.params.id;

        const [users] = await pool.query(
            "SELECT * FROM users WHERE id = ?",
            [userId]
        );

        if (!users.length) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const existingUser = users[0];

        const {
            first_name, last_name, gender,
            dob_bs, dob_ad,
            province, district, city, ward, tole,
            email, phone_number,
            role, category_id,
            password
        } = req.body;

        if(role === ROLES.DOCTOR){
            const [category] = await pool.query(
            `SELECT * FROM categories WHERE id = ?`, [id]
            );

            if(category.length == 0) return res.status(404).json({success: false, message: "Category Id not found", category: category[0]});
        }

        let profile_image = existingUser.profile_image;

        if (req.file) {
            uploadedTempPath = req.file.path;

            const fileName = `${Date.now()}.jpeg`;
            const outputDir = path.join("uploads", req.uploadFolder || "users");

            await fs.mkdir(outputDir, { recursive: true });

            newImagePath = path.join(outputDir, fileName);

            await processAndSaveImage(uploadedTempPath, newImagePath);

            // 🔥 DELETE OLD IMAGE
            if (existingUser.profile_image) {
                try {
                    await fs.unlink(existingUser.profile_image);
                } catch {}
            }

            profile_image = newImagePath;
        }

        let hashedPassword = existingUser.password;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        await pool.query(
            `UPDATE users SET
                first_name=?, last_name=?, gender=?,
                dob_bs=?, dob_ad=?,
                province=?, district=?, city=?, ward=?, tole=?,
                email=?, phone_number=?,
                profile_image=?, role=?, category_id=?, password=?
            WHERE id=?`,
            [
                first_name || existingUser.first_name,
                last_name || existingUser.last_name,
                gender || existingUser.gender,
                dob_bs || existingUser.dob_bs,
                dob_ad || existingUser.dob_ad,
                province || existingUser.province,
                district || existingUser.district,
                city || existingUser.city,
                ward || existingUser.ward,
                tole || existingUser.tole,
                email || existingUser.email,
                phone_number || existingUser.phone_number,
                profile_image,
                role || existingUser.role,
                category_id || existingUser.category_id,
                hashedPassword,
                userId
            ]
        );

        return res.status(200).json({
            success: true,
            message: "User updated successfully"
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });

    } finally {
        if (uploadedTempPath) {
            try { await fs.unlink(uploadedTempPath); } catch {}
        }
    }
};

export const deleteUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const [users] = await pool.query(
            "SELECT profile_image FROM users WHERE id = ?",
            [id]
        );

        if (!users.length) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const profileImage = users[0].profile_image;

        const [result] = await pool.query(
            "DELETE FROM users WHERE id = ?",
            [id]
        );

        if (result.affectedRows > 0 && profileImage) {
            try {
                await fs.unlink(profileImage);
            } catch {}
        }

        return res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
