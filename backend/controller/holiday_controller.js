import { pool } from "../config/db_config.js";

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR — SET CLINIC HOLIDAY
// ─────────────────────────────────────────────────────────────────────────────
export const setClinicHoliday = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { clinic_id } = req.params;
        const { holiday_date, reason } = req.body;

        if (!holiday_date) {
            return res.status(400).json({ success: false, message: "holiday_date is required" });
        }

        // Validate clinic ownership
        const [clinicRows] = await pool.query(
            `SELECT doctor_id FROM clinics WHERE id = ?`,
            [clinic_id]
        );
        if (clinicRows.length === 0) {
            return res.status(404).json({ success: false, message: "Clinic not found" });
        }
        if (clinicRows[0].doctor_id !== doctorId) {
            return res.status(403).json({ success: false, message: "You do not own this clinic" });
        }

        // Validate date is today or future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const inputDate = new Date(holiday_date);
        if (inputDate < today) {
            return res.status(400).json({ success: false, message: "Holiday date cannot be in the past" });
        }

        await pool.query(
            `INSERT INTO clinic_holidays (clinic_id, holiday_date, reason)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
            [clinic_id, holiday_date, reason || null]
        );

        return res.status(201).json({ success: true, message: "Holiday scheduled successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR — DELETE CLINIC HOLIDAY
// ─────────────────────────────────────────────────────────────────────────────
export const deleteClinicHoliday = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { clinic_id, hid } = req.params;

        // Validate clinic ownership
        const [clinicRows] = await pool.query(
            `SELECT doctor_id FROM clinics WHERE id = ?`,
            [clinic_id]
        );
        if (clinicRows.length === 0) {
            return res.status(404).json({ success: false, message: "Clinic not found" });
        }
        if (clinicRows[0].doctor_id !== doctorId) {
            return res.status(403).json({ success: false, message: "You do not own this clinic" });
        }

        const [result] = await pool.query(
            `DELETE FROM clinic_holidays WHERE id = ? AND clinic_id = ?`,
            [hid, clinic_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Holiday not found for this clinic" });
        }

        return res.status(200).json({ success: true, message: "Holiday deleted successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — GET CLINIC HOLIDAYS
// ─────────────────────────────────────────────────────────────────────────────
export const getClinicHolidays = async (req, res) => {
    try {
        const { clinic_id } = req.params;
        const { start_date, end_date } = req.query;

        let query = `SELECT * FROM clinic_holidays WHERE clinic_id = ?`;
        const params = [clinic_id];

        if (start_date && end_date) {
            query += ` AND holiday_date >= ? AND holiday_date <= ?`;
            params.push(start_date, end_date);
        } else {
            // Default: upcoming (>= CURDATE())
            query += ` AND holiday_date >= CURDATE()`;
        }

        query += ` ORDER BY holiday_date ASC`;

        const [rows] = await pool.query(query, params);
        return res.status(200).json({ success: true, count: rows.length, holidays: rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
