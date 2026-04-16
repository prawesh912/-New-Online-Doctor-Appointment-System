import { pool } from '../config/db_config.js';
import ROLES from '../constants/roles.js';
import bcrypt from "bcrypt";

export const getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query(
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
                created_at
             FROM users`
        );

        return res.status(200).json({
            success: true,
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
    try {
        const {
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
            password,
            role,
            category_id,
            confirm_password
        } = req.body;

        // Validation
        if (!first_name || !last_name || !gender || !province || !district || !city || !ward || !email || !phone_number || !password || !confirm_password) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided"
            });
        }

        if(!dob_bs && !dob_ad) return res.status(400).json({success: false, message: "Please fill dob in BS or AD is required"});

         // Validate role
        if (!Object.values(ROLES).includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        if(role == ROLES.DOCTOR && !category_id) return res.status(400).json({success: false, message: "Category id is required for role doctor"});

        // Password match check
        if (password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: "Passwords and confirm password do not match"
            });
        }

        // Check if email already exists
        const [existingUser] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await pool.query(
            `INSERT INTO users 
            (first_name, last_name, gender, dob_bs, dob_ad, province, district, city, ward, tole, email, phone_number, profile_image, role, category_id, password) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [first_name, last_name, gender, dob_bs, dob_ad, province, district, city, ward, tole, email, phone_number, profile_image, role, category_id, hashedPassword]
        );

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            user_id: result.insertId
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const deleteUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Valid user ID is required"
            });
        }

        const [existingUser] = await pool.query(
            "SELECT id FROM users WHERE id = ?",
            [id]
        );

        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const [result] = await pool.query(
            "DELETE FROM users WHERE id = ?",
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
            affectedRows: result.affectedRows
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};