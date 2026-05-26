import { pool } from "../config/db_config.js";
import { initializeKhaltiPayment } from "../utils/khalti.js";
import PAYMENT_MODES from "../constants/paymentMode.js";

/**
 * Start Khalti payment for an appointment. Returns { payment_url, pidx, amount }.
 */
export async function startKhaltiPaymentForAppointment({
    appointmentId,
    patientId,
    websiteUrl,
}) {
    const [apptRows] = await pool.query(`SELECT * FROM appointments WHERE id = ?`, [appointmentId]);
    if (apptRows.length === 0) {
        const err = new Error("Appointment not found");
        err.statusCode = 404;
        throw err;
    }
    const appointment = apptRows[0];

    if (appointment.payment_status === "paid") {
        const err = new Error("Appointment is already paid");
        err.statusCode = 400;
        throw err;
    }

    const [priceRows] = await pool.query(
        `SELECT price FROM pricing WHERE clinic_id = ? LIMIT 1`,
        [appointment.clinic_id]
    );
    if (priceRows.length === 0) {
        const err = new Error("Pricing is not set for this clinic");
        err.statusCode = 400;
        throw err;
    }
    const price = parseFloat(priceRows[0].price);

    const [pendingRows] = await pool.query(
        `SELECT id, pidx FROM payments
         WHERE appointment_id = ? AND status = 'pending' AND payment_gateway = 'khalti'
         ORDER BY id DESC LIMIT 1`,
        [appointmentId]
    );

    const returnUrl = `${process.env.BACKEND_URL || "http://localhost:8000"}/api/payment/complete-khalti-payment`;
    const khaltiResponse = await initializeKhaltiPayment({
        amount: Math.round(price * 100),
        purchase_order_id: appointmentId.toString(),
        purchase_order_name: `Appointment #${appointmentId}`,
        return_url: returnUrl,
        website_url: websiteUrl,
    });

    const remarks =
        appointment.payment_mode === PAYMENT_MODES.PREPAYMENT
            ? "Appointment prepayment"
            : "Appointment payment at visit";

    if (pendingRows.length > 0) {
        await pool.query(
            `UPDATE payments SET pidx = ?, amount = ?, remarks = ?, from_user_id = ? WHERE id = ?`,
            [khaltiResponse.pidx, price, remarks, patientId, pendingRows[0].id]
        );
    } else {
        await pool.query(
            `INSERT INTO payments
                (appointment_id, to_user_id, from_user_id, amount, transaction_type, remarks, payment_gateway, status, pidx)
             VALUES (?, ?, ?, ?, 'debit', ?, 'khalti', 'pending', ?)`,
            [
                appointmentId,
                appointment.doctor_id,
                patientId,
                price,
                remarks,
                khaltiResponse.pidx,
            ]
        );
    }

    return {
        payment_url: khaltiResponse.payment_url,
        pidx: khaltiResponse.pidx,
        amount: price,
        payment_mode: appointment.payment_mode,
    };
}
