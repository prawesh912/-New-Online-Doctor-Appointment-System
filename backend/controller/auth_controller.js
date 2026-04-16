import { pool } from '../config/db_config.js';
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import passport from 'passport';
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const login = async (req, res) => {
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
            `SELECT * FROM users WHERE email = ? OR phone_number = ?`,
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

        const token = jwt.sign(
            user,
            process.env.JWT_SECRET,
            { expiresIn: '7d'}
        )

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: user
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const continueWithGoogleButton = async (req, res) => {
    try {
        return res.sendFile(
            path.join(__dirname, "../templates/index.html")
        );
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const continueWithGoogle = async (req, res) => {
    try{
        passport.authenticate('google', { scope: ['profile', 'email']})
    }catch (err){
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}
export const continueWithGoogleCallBack = async (req, res) => {
    try{
        passport.authenticate('google', { failureRedirect: '/login'});
    }catch (err){
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}