import { pool } from "../config/db_config.js";

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT — SUBMIT CLINIC REVIEW
// ─────────────────────────────────────────────────────────────────────────────

export const submitClinicReview = async (req, res) => {
    try {
        const patientId = req.user.userId;
        const { clinic_id, appointment_id, rating, review } = req.body;

        if (!clinic_id || !appointment_id || !rating) {
            return res.status(400).json({ success: false, message: "clinic_id, appointment_id, and rating are required" });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
        }

        // Validate appointment belongs to patient, is completed, and matches clinic
        const [apptRows] = await pool.query(
            `SELECT id, patient_id, clinic_id, status FROM appointments WHERE id = ?`,
            [appointment_id]
        );
        if (apptRows.length === 0) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }
        const appt = apptRows[0];

        if (appt.patient_id !== patientId) {
            return res.status(403).json({ success: false, message: "This appointment does not belong to you" });
        }
        if (appt.status !== "completed") {
            return res.status(400).json({ success: false, message: "You can only review a completed appointment" });
        }
        if (appt.clinic_id !== parseInt(clinic_id)) {
            return res.status(400).json({ success: false, message: "Appointment does not match the given clinic" });
        }

        await pool.query(
            `INSERT INTO clinic_reviews (clinic_id, patient_id, appointment_id, rating, review)
             VALUES (?, ?, ?, ?, ?)`,
            [clinic_id, patientId, appointment_id, rating, review || null]
        );

        return res.status(201).json({ success: true, message: "Clinic review submitted successfully" });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "You have already reviewed this clinic for this appointment" });
        }
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT — SUBMIT DOCTOR REVIEW
// ─────────────────────────────────────────────────────────────────────────────

export const submitDoctorReview = async (req, res) => {
    try {
        const patientId = req.user.userId;
        const { doctor_id, appointment_id, clinic_id, rating, review } = req.body;

        if (!doctor_id || !appointment_id || !clinic_id || !rating) {
            return res.status(400).json({ success: false, message: "doctor_id, appointment_id, clinic_id, and rating are required" });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
        }

        // Validate appointment
        const [apptRows] = await pool.query(
            `SELECT id, patient_id, doctor_id, clinic_id, status FROM appointments WHERE id = ?`,
            [appointment_id]
        );
        if (apptRows.length === 0) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }
        const appt = apptRows[0];

        if (appt.patient_id !== patientId) {
            return res.status(403).json({ success: false, message: "This appointment does not belong to you" });
        }
        if (appt.status !== "completed") {
            return res.status(400).json({ success: false, message: "You can only review a completed appointment" });
        }
        if (appt.doctor_id !== parseInt(doctor_id)) {
            return res.status(400).json({ success: false, message: "Doctor does not match the appointment" });
        }
        if (appt.clinic_id !== parseInt(clinic_id)) {
            return res.status(400).json({ success: false, message: "Clinic does not match the appointment" });
        }

        await pool.query(
            `INSERT INTO doctor_reviews (doctor_id, patient_id, appointment_id, clinic_id, rating, review)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [doctor_id, patientId, appointment_id, clinic_id, rating, review || null]
        );

        return res.status(201).json({ success: true, message: "Doctor review submitted successfully" });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "You have already reviewed this doctor for this appointment" });
        }
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT — VIEW MY REVIEWS (paginated)
// ─────────────────────────────────────────────────────────────────────────────

export const getMyReviews = async (req, res) => {
    try {
        const patientId = req.user.userId;
        const limit  = parseInt(req.query.limit)  || 10;
        const page   = parseInt(req.query.page)   || 1;
        const offset = (page > 0 ? page - 1 : 0) * limit;

        const [clinicReviews] = await pool.query(
            `SELECT cr.*, 'clinic' AS review_type, c.name AS entity_name, NULL AS doctor_name
             FROM clinic_reviews cr
             JOIN clinics c ON cr.clinic_id = c.id
             WHERE cr.patient_id = ?`,
            [patientId]
        );

        const [doctorReviews] = await pool.query(
            `SELECT dr.*, 'doctor' AS review_type, NULL AS entity_name,
                    CONCAT(u.first_name, ' ', u.last_name) AS doctor_name
             FROM doctor_reviews dr
             JOIN users u ON dr.doctor_id = u.id
             WHERE dr.patient_id = ?`,
            [patientId]
        );

        const allReviews = [...clinicReviews, ...doctorReviews]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const total       = allReviews.length;
        const paginated   = allReviews.slice(offset, offset + limit);
        const total_pages = total > 0 ? Math.ceil(total / limit) : 0;

        return res.status(200).json({
            success: true,
            total_data: total, total_pages,
            current_page: total > 0 ? page : 0,
            has_next_page: page < total_pages,
            count: paginated.length,
            reviews: paginated,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — GET CLINIC REVIEWS (paginated)
// ─────────────────────────────────────────────────────────────────────────────

export const getClinicReviewsList = async (req, res) => {
    try {
        const { clinic_id } = req.params;
        const limit  = parseInt(req.query.limit)  || 10;
        const page   = parseInt(req.query.page)   || 1;
        const offset = (page > 0 ? page - 1 : 0) * limit;

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM clinic_reviews WHERE clinic_id = ?`, [clinic_id]
        );

        const [reviews] = await pool.query(
            `SELECT cr.*,
                    CONCAT(u.first_name, ' ', u.last_name) AS patient_name,
                    u.profile_image AS patient_image
             FROM clinic_reviews cr
             JOIN users u ON cr.patient_id = u.id
             WHERE cr.clinic_id = ?
             ORDER BY cr.created_at DESC
             LIMIT ? OFFSET ?`,
            [clinic_id, limit, offset]
        );

        const [[{ avg_rating }]] = await pool.query(
            `SELECT ROUND(AVG(rating), 1) AS avg_rating FROM clinic_reviews WHERE clinic_id = ?`, [clinic_id]
        );

        const total_pages = total > 0 ? Math.ceil(total / limit) : 0;
        return res.status(200).json({
            success: true,
            avg_rating: avg_rating || 0,
            total_data: total, total_pages,
            current_page: total > 0 ? page : 0,
            has_next_page: page < total_pages,
            count: reviews.length,
            reviews,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — GET DOCTOR REVIEWS (paginated)
// ─────────────────────────────────────────────────────────────────────────────

export const getDoctorReviewsList = async (req, res) => {
    try {
        const { doctor_id } = req.params;
        const limit  = parseInt(req.query.limit)  || 10;
        const page   = parseInt(req.query.page)   || 1;
        const offset = (page > 0 ? page - 1 : 0) * limit;

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM doctor_reviews WHERE doctor_id = ?`, [doctor_id]
        );

        const [reviews] = await pool.query(
            `SELECT dr.*,
                    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                    p.profile_image AS patient_image,
                    c.name AS clinic_name
             FROM doctor_reviews dr
             JOIN users p    ON dr.patient_id = p.id
             JOIN clinics c  ON dr.clinic_id  = c.id
             WHERE dr.doctor_id = ?
             ORDER BY dr.created_at DESC
             LIMIT ? OFFSET ?`,
            [doctor_id, limit, offset]
        );

        const [[{ avg_rating }]] = await pool.query(
            `SELECT ROUND(AVG(rating), 1) AS avg_rating FROM doctor_reviews WHERE doctor_id = ?`, [doctor_id]
        );

        const total_pages = total > 0 ? Math.ceil(total / limit) : 0;
        return res.status(200).json({
            success: true,
            avg_rating: avg_rating || 0,
            total_data: total, total_pages,
            current_page: total > 0 ? page : 0,
            has_next_page: page < total_pages,
            count: reviews.length,
            reviews,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
