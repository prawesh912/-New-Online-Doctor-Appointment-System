import { pool } from "../config/db_config.js";
import { verifyKhaltiPayment } from "../utils/khalti.js";
import PAYMENT_MODES from "../constants/paymentMode.js";
import { startKhaltiPaymentForAppointment } from "../services/appointmentPaymentService.js";
import ROLES from "../constants/roles.js";

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZE KHALTI PAYMENT
// Patient: own appointment (Prepayment retry or Pay Later self-pay).
// Receptionist: Pay Later appointments at their clinic — patient pays via returned URL.
// ─────────────────────────────────────────────────────────────────────────────
export const initializePayment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const { appointment_id, website_url } = req.body;

        if (!appointment_id || !website_url) {
            return res.status(400).json({
                success: false,
                message: "appointment_id and website_url are required",
            });
        }

        const [apptRows] = await pool.query(`SELECT * FROM appointments WHERE id = ?`, [appointment_id]);
        if (apptRows.length === 0) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }
        const appointment = apptRows[0];

        if (role === ROLES.PATIENT) {
            if (appointment.patient_id !== userId) {
                return res.status(403).json({ success: false, message: "This appointment does not belong to you" });
            }
        } else if (role === ROLES.RECEPTIONIST) {
            const [staffRows] = await pool.query(
                `SELECT id FROM clinic_staff WHERE clinic_id = ? AND user_id = ? AND status = 'active'`,
                [appointment.clinic_id, userId]
            );
            if (staffRows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: "You are not an active receptionist at this clinic",
                });
            }
            if (appointment.payment_mode !== PAYMENT_MODES.PAY_LATER) {
                return res.status(400).json({
                    success: false,
                    message: "Receptionist can only initiate payment for Pay Later appointments",
                });
            }
        } else if (role !== ROLES.ADMIN) {
            return res.status(403).json({ success: false, message: "Not authorized to initialize payment" });
        }

        const payment = await startKhaltiPaymentForAppointment({
            appointmentId: appointment_id,
            patientId: appointment.patient_id,
            websiteUrl: website_url,
        });

        return res.status(200).json({
            success: true,
            payment_url: payment.payment_url,
            pidx: payment.pidx,
            amount: payment.amount,
            payment_mode: payment.payment_mode,
            message:
                appointment.payment_mode === PAYMENT_MODES.PREPAYMENT
                    ? "Complete prepayment via Khalti"
                    : "Payment link ready for patient to pay at visit",
        });
    } catch (err) {
        const status = err.statusCode || 500;
        return res.status(status).json({
            success: false,
            message: err.message,
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// KHALTI CALLBACK — COMPLETE PAYMENT
// ─────────────────────────────────────────────────────────────────────────────
export const completePayment = async (req, res) => {
    try {
        const {
            pidx,
            transaction_id,
        } = req.query;

        if (!pidx) {
            return res.status(400).json({
                success: false,
                message: "pidx is required",
            });
        }

        const paymentInfo = await verifyKhaltiPayment(pidx);

        const [paymentRows] = await pool.query(`SELECT * FROM payments WHERE pidx = ?`, [pidx]);
        if (paymentRows.length === 0) {
            return res.status(404).json({ success: false, message: "Payment record not found" });
        }
        const payment = paymentRows[0];

        const queryDataJson = JSON.stringify(req.query);
        const verifyDataJson = JSON.stringify(paymentInfo);

        if (paymentInfo.status === "Completed") {
            await pool.query(
                `UPDATE payments 
                 SET status = 'completed', 
                     transactionId = ?, 
                     api_query_from_user = ?, 
                     date_from_verification_req = ?
                 WHERE id = ?`,
                [transaction_id || paymentInfo.transaction_id || null, queryDataJson, verifyDataJson, payment.id]
            );

            await pool.query(
                `UPDATE appointments 
                 SET payment_status = 'paid', 
                     payment_id = ? 
                 WHERE id = ?`,
                [payment.id, payment.appointment_id]
            );

            if (process.env.FRONTEND_URL) {
                return res.redirect(
                    `${process.env.FRONTEND_URL}/payment-success?appointment_id=${payment.appointment_id}&transaction_id=${transaction_id || pidx}`
                );
            }

            return res.status(200).json({
                success: true,
                message: "Payment completed successfully",
                verifiedPayment: paymentInfo,
            });
        }

        await pool.query(
            `UPDATE payments 
             SET status = 'pending', 
                 api_query_from_user = ?, 
                 date_from_verification_req = ?
             WHERE id = ?`,
            [queryDataJson, verifyDataJson, payment.id]
        );

        if (process.env.FRONTEND_URL) {
            return res.redirect(`${process.env.FRONTEND_URL}/payment-failed?appointment_id=${payment.appointment_id}`);
        }

        return res.status(400).json({
            success: false,
            message: "Payment was not completed successfully",
            verifiedPayment: paymentInfo,
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "An error occurred during payment verification",
            error: err.message,
        });
    }
};

export { getPatientPaymentHistory as getPaymentHistory } from "./payment_history_controller.js";
