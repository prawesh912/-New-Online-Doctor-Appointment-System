import * as arctic from "arctic";
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
            {
                userId: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

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

// VERIFY EMAIL
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    const [users] = await pool.query(
      `SELECT * FROM users WHERE emailVerificationToken = ?`,
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const user = users[0];

    if (new Date() > new Date(user.emailVerificationExpires)) {
      return res.status(400).json({ message: "Token expired" });
    }

    await pool.query(
      `UPDATE users 
       SET email_verified = 1, emailVerificationToken = NULL, emailVerificationExpires = NULL
       WHERE id = ?`,
      [user.id]
    );

    res.send("Email verified successfully");

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// RESEND VERIFICATION EMAIL
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const [users] = await pool.query(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    if (user.email_verified) {
      return res.json({ message: "Email already verified" });
    }

    // generate new token
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 60);

    await pool.query(
      `UPDATE users 
       SET emailVerificationToken = ?, emailVerificationExpires = ?
       WHERE id = ?`,
      [token, expiry, user.id]
    );

    const verifyLink = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;

    await sendEmail(
      email,
      "Resend Email Verification",
      `<p>Click below to verify your email:</p>
       <a href="${verifyLink}">${verifyLink}</a>`
    );

    res.json({ message: "Verification email resent" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};