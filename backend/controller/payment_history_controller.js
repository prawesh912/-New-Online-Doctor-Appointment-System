import { pool } from "../config/db_config.js";
import { getPaginationParams, paginatedResponse, getDateRange } from "../utils/pagination.js";

const PAYMENT_SELECT = `
    p.*,
    a.appointment_date, a.appointment_time, a.token_number, a.status AS appointment_status,
    c.name AS clinic_name,
    CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
    CONCAT(pt.first_name, ' ', pt.last_name) AS patient_name,
    pt.email AS patient_email
`;

const PAYMENT_JOINS = `
    FROM payments p
    LEFT JOIN appointments a ON p.appointment_id = a.id
    LEFT JOIN clinics c ON a.clinic_id = c.id
    LEFT JOIN users d ON a.doctor_id = d.id
    LEFT JOIN users pt ON p.from_user_id = pt.id
`;

async function fetchPaymentHistory(baseWhere, params, query, { defaultLatest = false } = {}) {
    const { status, transaction_type, start_date, end_date } = query;
    const hasDateFilter = Boolean(start_date || end_date);

    let limit, page, offset;
    if (defaultLatest && !hasDateFilter) {
        limit = parseInt(query.limit) || 10;
        page = 1;
        offset = 0;
    } else {
        ({ limit, page, offset } = getPaginationParams(query));
    }

    let where = baseWhere;
    const queryParams = [...params];

    if (start_date) {
        where += ` AND DATE(p.payment_date) >= ?`;
        queryParams.push(start_date);
    }
    if (end_date) {
        where += ` AND DATE(p.payment_date) <= ?`;
        queryParams.push(end_date);
    }
    if (status) {
        where += ` AND p.status = ?`;
        queryParams.push(status);
    }
    if (transaction_type) {
        where += ` AND p.transaction_type = ?`;
        queryParams.push(transaction_type);
    }

    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total ${PAYMENT_JOINS} ${where}`,
        queryParams
    );

    const [payments] = await pool.query(
        `SELECT ${PAYMENT_SELECT} ${PAYMENT_JOINS} ${where}
         ORDER BY p.payment_date DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
    );

    const extra = {};
    if (start_date) extra.date_from = start_date;
    if (end_date) extra.date_to = end_date;
    if (defaultLatest && !hasDateFilter) extra.note = "Latest payments (no date filter applied)";

    return paginatedResponse({
        total,
        page,
        limit,
        items: payments,
        key: "payments",
        extra,
    });
}

export const getPatientPaymentHistory = async (req, res) => {
    try {
        const patientId = req.user.userId;
        const data = await fetchPaymentHistory(
            `WHERE p.from_user_id = ?`,
            [patientId],
            req.query,
            { defaultLatest: true }
        );
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const getAdminPaymentHistory = async (req, res) => {
    try {
        const { patient_id } = req.query;
        let baseWhere = `WHERE 1=1`;
        const params = [];

        if (patient_id) {
            baseWhere += ` AND p.from_user_id = ?`;
            params.push(patient_id);
        }

        const { start_date, end_date } = getDateRange(req.query);
        const data = await fetchPaymentHistory(
            baseWhere,
            params,
            { ...req.query, start_date: req.query.start_date || start_date, end_date: req.query.end_date || end_date }
        );
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const getAdminPatientPaymentHistory = async (req, res) => {
    try {
        const { patient_id } = req.params;
        const { start_date, end_date } = getDateRange(req.query);
        const data = await fetchPaymentHistory(
            `WHERE p.from_user_id = ?`,
            [patient_id],
            { ...req.query, start_date: req.query.start_date || start_date, end_date: req.query.end_date || end_date }
        );
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
