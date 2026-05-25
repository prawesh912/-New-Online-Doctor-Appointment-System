import { pool } from "../config/db_config.js";

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR — GET OWN EARNINGS
// ─────────────────────────────────────────────────────────────────────────────

export const getDoctorEarnings = async (req, res) => {
    try {
        const doctorId = req.user.userId;

        const today      = new Date().toISOString().split("T")[0];
        const start_date = req.query.start_date || today;
        const end_date   = req.query.end_date   || today;

        // Total earnings
        const [[{ total_earnings }]] = await pool.query(
            `SELECT COALESCE(SUM(pr.price), 0) AS total_earnings
             FROM appointments a
             JOIN pricing pr ON pr.clinic_id = a.clinic_id
             WHERE a.doctor_id = ?
               AND a.status = 'completed'
               AND a.appointment_date >= ?
               AND a.appointment_date <= ?`,
            [doctorId, start_date, end_date]
        );

        // Per-clinic breakdown
        const [breakdown] = await pool.query(
            `SELECT c.id AS clinic_id, c.name AS clinic_name,
                    COUNT(a.id)          AS appointment_count,
                    COALESCE(SUM(pr.price), 0) AS earnings
             FROM appointments a
             JOIN clinics c   ON a.clinic_id = c.id
             JOIN pricing pr  ON pr.clinic_id = a.clinic_id
             WHERE a.doctor_id = ?
               AND a.status = 'completed'
               AND a.appointment_date >= ?
               AND a.appointment_date <= ?
             GROUP BY c.id, c.name`,
            [doctorId, start_date, end_date]
        );

        return res.status(200).json({
            success: true,
            date_from: start_date,
            date_to:   end_date,
            currency:  "NPR",
            total_earnings: parseFloat(total_earnings),
            breakdown,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR (CLINIC OWNER) — GET CLINIC REVENUE
// ─────────────────────────────────────────────────────────────────────────────

export const getClinicRevenue = async (req, res) => {
    try {
        const doctorId  = req.user.userId;
        const { clinic_id } = req.params;

        // Verify ownership
        const [clinicRows] = await pool.query(
            `SELECT id, name FROM clinics WHERE id = ? AND doctor_id = ?`,
            [clinic_id, doctorId]
        );
        if (clinicRows.length === 0) {
            return res.status(403).json({ success: false, message: "You do not own this clinic" });
        }

        const today      = new Date().toISOString().split("T")[0];
        const start_date = req.query.start_date || today;
        const end_date   = req.query.end_date   || today;

        // Total revenue
        const [[{ total_revenue }]] = await pool.query(
            `SELECT COALESCE(SUM(pr.price), 0) AS total_revenue
             FROM appointments a
             JOIN pricing pr ON pr.clinic_id = a.clinic_id
             WHERE a.clinic_id = ?
               AND a.status = 'completed'
               AND a.appointment_date >= ?
               AND a.appointment_date <= ?`,
            [clinic_id, start_date, end_date]
        );

        // Per-doctor breakdown
        const [breakdown] = await pool.query(
            `SELECT u.id AS doctor_id,
                    CONCAT(u.first_name, ' ', u.last_name) AS doctor_name,
                    COUNT(a.id)                            AS appointment_count,
                    COALESCE(SUM(pr.price), 0)             AS revenue
             FROM appointments a
             JOIN users u    ON a.doctor_id  = u.id
             JOIN pricing pr ON pr.clinic_id = a.clinic_id
             WHERE a.clinic_id = ?
               AND a.status = 'completed'
               AND a.appointment_date >= ?
               AND a.appointment_date <= ?
             GROUP BY u.id, u.first_name, u.last_name`,
            [clinic_id, start_date, end_date]
        );

        return res.status(200).json({
            success: true,
            clinic_id: parseInt(clinic_id),
            clinic_name: clinicRows[0].name,
            date_from: start_date,
            date_to:   end_date,
            currency:  "NPR",
            total_revenue: parseFloat(total_revenue),
            breakdown,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
