import { pool } from "../config/db_config.js";

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT — SEARCH CLINICS (public, paginated with filters)
// ─────────────────────────────────────────────────────────────────────────────

export const searchClinics = async (req, res) => {
    try {
        const {
            province, district, city, ward,
            name, min_rating, max_rating, category_id,
        } = req.query;

        const limit  = parseInt(req.query.limit)  || 10;
        const page   = parseInt(req.query.page)   || 1;
        const offset = (page > 0 ? page - 1 : 0) * limit;

        let joins  = `LEFT JOIN (
                        SELECT clinic_id, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS review_count
                        FROM clinic_reviews GROUP BY clinic_id
                      ) cr ON cr.clinic_id = c.id
                      LEFT JOIN doctor_kyc dk ON dk.user_id = c.doctor_id
                      LEFT JOIN categories cat ON cat.id = dk.category_id`;

        let whereClause = `WHERE c.is_active = 1`;
        const params = [];

        if (province)    { whereClause += ` AND c.province = ?`;     params.push(province); }
        if (district)    { whereClause += ` AND c.district = ?`;     params.push(district); }
        if (city)        { whereClause += ` AND c.city = ?`;         params.push(city); }
        if (ward)        { whereClause += ` AND c.ward = ?`;         params.push(parseInt(ward)); }
        if (name)        { whereClause += ` AND c.name LIKE ?`;      params.push(`%${name}%`); }
        if (category_id) { whereClause += ` AND dk.category_id = ?`; params.push(category_id); }
        if (min_rating)  { whereClause += ` AND COALESCE(cr.avg_rating, 0) >= ?`; params.push(parseFloat(min_rating)); }
        if (max_rating)  { whereClause += ` AND COALESCE(cr.avg_rating, 0) <= ?`; params.push(parseFloat(max_rating)); }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM clinics c ${joins} ${whereClause}`, params
        );

        const [clinics] = await pool.query(
            `SELECT c.*,
                    COALESCE(cr.avg_rating, 0)   AS avg_rating,
                    COALESCE(cr.review_count, 0) AS review_count,
                    cat.name AS specialization,
                    u.first_name AS doctor_first, u.last_name AS doctor_last
             FROM clinics c
             JOIN users u ON c.doctor_id = u.id
             ${joins}
             ${whereClause}
             ORDER BY cr.avg_rating DESC, c.name ASC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const total_pages = total > 0 ? Math.ceil(total / limit) : 0;
        return res.status(200).json({
            success: true,
            total_data: total,
            total_pages,
            current_page: total > 0 ? page : 0,
            has_next_page: page < total_pages,
            count: clinics.length,
            clinics,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CLINIC SCHEDULE (public)
// ─────────────────────────────────────────────────────────────────────────────

export const getClinicSchedulePublic = async (req, res) => {
    try {
        const { id } = req.params;

        const [clinicRows] = await pool.query(
            `SELECT c.*, u.first_name AS doctor_first, u.last_name AS doctor_last
             FROM clinics c JOIN users u ON c.doctor_id = u.id
             WHERE c.id = ?`,
            [id]
        );
        if (clinicRows.length === 0) {
            return res.status(404).json({ success: false, message: "Clinic not found" });
        }

        const [schedule] = await pool.query(
            `SELECT * FROM clinic_schedules WHERE clinic_id = ? ORDER BY FIELD(day_of_week,'sunday','monday','tuesday','wednesday','thursday','friday','saturday')`,
            [id]
        );

        const [holidays] = await pool.query(
            `SELECT * FROM clinic_holidays WHERE clinic_id = ? AND holiday_date >= CURDATE() ORDER BY holiday_date ASC`,
            [id]
        );

        return res.status(200).json({
            success: true,
            clinic: clinicRows[0],
            schedule,
            upcoming_holidays: holidays,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTORS IN A CLINIC (public)
// ─────────────────────────────────────────────────────────────────────────────

export const getDoctorsInClinic = async (req, res) => {
    try {
        const { id } = req.params;

        // Get clinic to find owner doctor
        const [clinicRows] = await pool.query(`SELECT doctor_id FROM clinics WHERE id = ? AND is_active = 1`, [id]);
        if (clinicRows.length === 0) {
            return res.status(404).json({ success: false, message: "Clinic not found" });
        }
        const ownerDoctorId = clinicRows[0].doctor_id;

        // Get all doctor IDs at this clinic (owner + associates)
        const [assocRows] = await pool.query(
            `SELECT doctor_id FROM clinic_doctors WHERE clinic_id = ? AND is_active = 1`,
            [id]
        );
        const doctorIds = [...new Set([ownerDoctorId, ...assocRows.map(r => r.doctor_id)])];

        if (doctorIds.length === 0) {
            return res.status(200).json({ success: true, count: 0, doctors: [] });
        }

        const placeholders = doctorIds.map(() => "?").join(",");

        const [doctors] = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.phone_number, u.profile_image, u.gender,
                    dk.years_experience, dk.nmc_registration_number,
                    cat.name AS specialization,
                    COALESCE(ROUND(AVG(dr.rating), 1), 0) AS avg_rating,
                    COUNT(dr.id)                           AS review_count,
                    IF(u.id = ?, 'owner', 'associate')    AS doctor_role
             FROM users u
             LEFT JOIN doctor_kyc dk ON dk.user_id = u.id
             LEFT JOIN categories cat ON cat.id = dk.category_id
             LEFT JOIN doctor_reviews dr ON dr.doctor_id = u.id AND dr.clinic_id = ?
             WHERE u.id IN (${placeholders}) AND u.role = 'doctor'
             GROUP BY u.id`,
            [ownerDoctorId, id, ...doctorIds]
        );

        return res.status(200).json({ success: true, count: doctors.length, doctors });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// LIVE TOKEN STATUS — now handled in appointment_controller.js
// This is a re-export alias for the route file to keep routing clean
// ─────────────────────────────────────────────────────────────────────────────
// (getClinicTokenStatus is exported from appointment_controller.js directly)
