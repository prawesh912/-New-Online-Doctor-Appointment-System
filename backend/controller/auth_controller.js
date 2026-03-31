import { pool } from '../config/db_config.js';
import bcrypt from "bcrypt";

export const loginPatient = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Email/Phone and password are required"
            });
        }

        // Check user by email OR phone
        const [users] = await pool.query(
            `SELECT * FROM patients WHERE email = ? OR phone_number = ?`,
            [identifier, identifier]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Remove password before sending response
        delete user.password;

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: user
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};