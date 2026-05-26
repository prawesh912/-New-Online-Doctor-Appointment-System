import { pool } from "../config/db_config.js";
import { getPaginationParams, paginatedResponse, getDateRange } from "../utils/pagination.js";

const APPOINTMENT_SELECT = `
    a.*,
    c.name AS clinic_name,
    p.first_name AS patient_first, p.last_name AS patient_last, p.email AS patient_email,
    d.first_name AS doctor_first, d.last_name AS doctor_last,
    pr.price AS appointment_price
`;

const APPOINTMENT_JOINS = `
    FROM appointments a
    JOIN clinics c ON a.clinic_id = c.id
    JOIN users p ON a.patient_id = p.id
    JOIN users d ON a.doctor_id = d.id
    LEFT JOIN pricing pr ON pr.clinic_id = a.clinic_id
`;

async function fetchAppointmentHistory(baseWhere, params, query, extra = {}) {
    const { start_date, end_date } = getDateRange(query);
    const { status, clinic_id, doctor_id, patient_id, search } = query;
    const { limit, page, offset } = getPaginationParams(query);

    let where = `${baseWhere} AND a.appointment_date >= ? AND a.appointment_date <= ?`;
    const queryParams = [...params, start_date, end_date];

    if (status) {
        where += ` AND a.status = ?`;
        queryParams.push(status);
    }
    if (clinic_id) {
        where += ` AND a.clinic_id = ?`;
        queryParams.push(clinic_id);
    }
    if (doctor_id) {
        where += ` AND a.doctor_id = ?`;
        queryParams.push(doctor_id);
    }
    if (patient_id) {
        where += ` AND a.patient_id = ?`;
        queryParams.push(patient_id);
    }
    if (search) {
        where += ` AND (CONCAT(p.first_name, ' ', p.last_name) LIKE ? OR p.email LIKE ?)`;
        queryParams.push(`%${search}%`, `%${search}%`);
    }

    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total ${APPOINTMENT_JOINS} ${where}`,
        queryParams
    );

    const [appointments] = await pool.query(
        `SELECT ${APPOINTMENT_SELECT} ${APPOINTMENT_JOINS} ${where}
         ORDER BY a.appointment_date DESC, a.appointment_time DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
    );

    return paginatedResponse({
        total,
        page,
        limit,
        items: appointments,
        key: "appointments",
        extra: { date_from: start_date, date_to: end_date, ...extra },
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT — APPOINTMENT HISTORY
// ─────────────────────────────────────────────────────────────────────────────
export const getPatientAppointmentHistory = async (req, res) => {
    try {
        const patientId = req.user.userId;
        const data = await fetchAppointmentHistory(
            `WHERE a.patient_id = ?`,
            [patientId],
            req.query
        );
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR — APPOINTMENT HISTORY (optional patient_id filter)
// ─────────────────────────────────────────────────────────────────────────────
export const getDoctorAppointmentHistory = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const query = { ...req.query };
        if (req.query.patient_id) {
            query.patient_id = req.query.patient_id;
        }
        const data = await fetchAppointmentHistory(
            `WHERE a.doctor_id = ?`,
            [doctorId],
            query
        );
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// RECEPTIONIST — CLINIC APPOINTMENT HISTORY (optional patient_id filter)
// ─────────────────────────────────────────────────────────────────────────────
export const getReceptionistAppointmentHistory = async (req, res) => {
    try {
        const receptionistId = req.user.userId;
        const { clinic_id } = req.params;

        const [staffRows] = await pool.query(
            `SELECT id FROM clinic_staff WHERE clinic_id = ? AND user_id = ? AND status = 'active'`,
            [clinic_id, receptionistId]
        );
        if (staffRows.length === 0) {
            return res.status(403).json({ success: false, message: "Not authorized for this clinic" });
        }

        const query = { ...req.query };
        if (req.query.patient_id) {
            query.patient_id = req.query.patient_id;
        }

        const data = await fetchAppointmentHistory(
            `WHERE a.clinic_id = ?`,
            [clinic_id],
            query,
            { clinic_id: parseInt(clinic_id) }
        );
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — ALL APPOINTMENT HISTORY
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminAppointmentHistory = async (req, res) => {
    try {
        const data = await fetchAppointmentHistory(`WHERE 1=1`, [], req.query);
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
