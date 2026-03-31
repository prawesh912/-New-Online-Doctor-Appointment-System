import { pool } from '../config/db_config.js';
import bcrypt from "bcrypt";

export const getAllPatients = async (req, res) => {
    try {
        const [patients] = await pool.query(
            `SELECT 
                id,
                first_name,
                last_name,
                age,
                dob,
                address,
                email,
                phone_number,
                profile_image,
                created_at
             FROM patients`
        );

        return res.status(200).json({
            success: true,
            count: patients.length,
            patients: patients
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Patient ID is required"
            });
        }

        const [patients] = await pool.query(
            `SELECT 
                id,
                first_name,
                last_name,
                age,
                dob,
                address,
                email,
                phone_number,
                profile_image,
                created_at
             FROM patients 
             WHERE id = ?`,
            [id]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        return res.status(200).json({
            success: true,
            patient: patients[0]
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const createPatient = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            age,
            dob,
            address,
            email,
            phone_number,
            profile_image,
            password,
            confirm_password
        } = req.body;

        // Validation
        if (!first_name || !last_name || !age || !address || !email || !phone_number || !password || !confirm_password) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided"
            });
        }

        // Password match check
        if (password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        // Check if email already exists
        const [existingUser] = await pool.query(
            "SELECT * FROM patients WHERE email = ?",
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

        // Insert patient
        const [result] = await pool.query(
            `INSERT INTO patients 
            (first_name, last_name, age, dob, address, email, phone_number, profile_image, password) 
            VALUES (?,?,?,?,?,?,?,?,?)`,
            [first_name, last_name, age, dob, address, email, phone_number, profile_image, hashedPassword]
        );

        return res.status(201).json({
            success: true,
            message: "Patient created successfully",
            patient_id: result.insertId
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const deletePatientById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Valid patient ID is required"
            });
        }

        const [existingPatient] = await pool.query(
            "SELECT id FROM patients WHERE id = ?",
            [id]
        );

        if (existingPatient.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        const [result] = await pool.query(
            "DELETE FROM patients WHERE id = ?",
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Patient deleted successfully",
            affectedRows: result.affectedRows
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};