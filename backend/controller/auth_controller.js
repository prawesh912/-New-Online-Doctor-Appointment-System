import * as arctic from "arctic";
import { pool } from '../config/db_config.js';
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import passport from 'passport';
import path from "path";
import { fileURLToPath } from "url";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from 'crypto';

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
    res.status(500).json({
      success: false,
      message: err.message
    });
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
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 10 min

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
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const sendForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ success: true, message: "email is required." });

    const [foundUser] = await pool.query(`SELECT id, email from users where email = ?`, [email]);

    if (foundUser.length === 0) return res.status(404).json({ success: true, message: "Email not found" });

    const OTP = crypto.randomInt(100000, 999999).toString();
    const OTP_expiry = new Date(Date.now() + 1000 * 60 * 60); // 10 min

    await pool.query(
      `UPDATE users SET otp = ?, otp_expiry = ? where id = ?`,
      [OTP, OTP_expiry, foundUser[0].id]
    );

    await sendEmail(
      email,
      "Forgot Password OTP",
        `<p>Your 6-digit OTP for Forgot Password is given below:</p><br><br>
      <p><strong>Please use this OTP: <span style="color:red;">${OTP}</span></strong></p><br><br>
      <p>OTP is valid for 10 minute. Request for new OTP afterwards.</p>
      `
    );

    return res.status(200).json({ success: true, message: "OTP has been sent successfully to your email" });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

export const resendForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ success: true, message: "email is required." });

    const [foundUser] = await pool.query(`SELECT id, email from users where email = ?`, [email]);

    if (foundUser.length === 0) return res.status(404).json({ success: true, message: "Email not found" });

    const OTP = crypto.randomInt(100000, 999999).toString();
    const OTP_expiry = new Date(Date.now() + 1000 * 60 * 60); // 10 min

    await pool.query(
      `UPDATE users SET otp = ?, otp_expiry = ? where id = ?`,
      [OTP, OTP_expiry, foundUser.id]
    );

    await sendEmail(
      email,
      "Resend Forgot Password OTP",
        `<p>Your new 6-digit OTP for Forgot Password is given below:</p><br><br>
      <p><strong>Please use this OTP: <span style="color:red;">${OTP}</span></strong></p><br><br>
      <p>OTP is valid for 10 minute. Request for new OTP afterwards.</p>
      `
    );

    return res.status(200).json({ success: true, message: "OTP has been sent successfully to your email" });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required." });

    // 1. Get the results from the database
    const [rows] = await pool.query(`SELECT id, email, otp, otp_expiry FROM users WHERE email = ?`, [email]);

    // 2. Check if the array is empty
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Email not found" });

    // 3. Define the user object from the first row
    const user = rows[0];

    // 4. Now check properties on 'user' (NOT rows/foundUser)
    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // 5. Use toString() safely on the user object
    if (otp.toString() !== user.otp.toString()) {
      return res.status(400).json({ success: false, message: "OTP not matched." });
    }

    // 6. Success logic
    await pool.query(
      `UPDATE users SET otp = NULL, otp_expiry = NULL WHERE id = ?`,
      [user.id]
    );

    const resetPasswordToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        purpose: 'password_reset'
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.status(200).json({ 
      success: true, 
      message: "OTP verified successfully", 
      reset_password_token: resetPasswordToken 
    });
    
  } catch (err) {
    // This will now catch actual errors instead of crashing on the toString call
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { password, confirm_password, reset_password_token } = req.body;

    if (!password || !confirm_password || !reset_password_token) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (password !== confirm_password) {
        return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    // Verify the token
    const decoded = jwt.verify(reset_password_token, process.env.JWT_SECRET);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the database
    await pool.query(
      `UPDATE users SET password = ? WHERE id = ?`, 
      [hashedPassword, decoded.userId]
    );

    return res.status(200).json({ 
      success: true, 
      message: "Password reset successfully",
      userId: decoded.userId
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: "Reset session expired. Please start over." });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};