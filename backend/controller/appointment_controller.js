import { pool } from "../config/db_config.js";
import { sendEmail } from "../utils/sendEmail.js";
import PAYMENT_MODES, { parsePaymentMode } from "../constants/paymentMode.js";
import { startKhaltiPaymentForAppointment } from "../services/appointmentPaymentService.js";
import { getTodayLocal } from "../utils/pagination.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate token for an appointment: format YYYYMMDD-NNN
 * NNN resets to 001 each day per clinic.
 */
async function generateToken(clinic_id, appointment_date) {
    const [countResult] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM appointments
         WHERE clinic_id = ? AND appointment_date = ?`,
        [clinic_id, appointment_date]
    );
    const n = (countResult[0].cnt || 0) + 1;
    const datePart = appointment_date.replace(/-/g, "");
    return `${datePart}-${String(n).padStart(3, "0")}`;
}

/**
 * Validate that a doctor works at a clinic (either owner or in clinic_doctors).
 */
async function isDoctorAtClinic(clinic_id, doctor_id) {
    const [clinicRows] = await pool.query(
        `SELECT doctor_id FROM clinics WHERE id = ?`,
        [clinic_id]
    );
    if (clinicRows.length === 0) return false;
    if (clinicRows[0].doctor_id === doctor_id) return true;

    const [assocRows] = await pool.query(
        `SELECT id FROM clinic_doctors WHERE clinic_id = ? AND doctor_id = ? AND is_active = 1`,
        [clinic_id, doctor_id]
    );
    return assocRows.length > 0;
}

/**
 * Send appointment notification emails.
 */
async function sendAppointmentEmails({ event, appointment, patientEmail, doctorEmail, clinicEmail, reason }) {
    const dateStr = appointment.appointment_date instanceof Date
        ? appointment.appointment_date.toISOString().split("T")[0]
        : appointment.appointment_date;
    const timeStr = appointment.appointment_time || "";
    const patientName = `${appointment.patient_first || ""} ${appointment.patient_last || ""}`.trim();
    const doctorName = `${appointment.doctor_first || ""} ${appointment.doctor_last || ""}`.trim();
    const clinicName = appointment.clinic_name || "";
    const token = appointment.token_number || "N/A";
    const reasonText = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : "";

    const subjects = {
        booked: `New Appointment Booked — Token ${token}`,
        confirmed: `Appointment Confirmed — Token ${token}`,
        cancelled: `Appointment Cancelled — Token ${token}`,
        rescheduled: `Appointment Rescheduled — Token ${token}`,
        rejected: `Appointment Rejected — ${clinicName}`,
    };

    const bodyFor = (recipient) => `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#2563eb">Online Doctor Appointment</h2>
          <p>Dear ${recipient},</p>
          <p>Your appointment details:</p>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Patient</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${patientName}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Doctor</strong></td><td style="padding:8px;border:1px solid #e5e7eb">Dr. ${doctorName}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Clinic</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${clinicName}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Date</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${dateStr}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Time</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${timeStr}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Token</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${token}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Status</strong></td><td style="padding:8px;border:1px solid #e5e7eb;text-transform:capitalize">${event}</td></tr>
            ${appointment.reason ? `<tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Complaint</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${appointment.reason}</td></tr>` : ""}
          </table>
          ${reasonText}
          <p style="margin-top:16px;color:#6b7280;font-size:12px">This is an automated message. Please do not reply.</p>
        </div>
    `;

    const emails = [];
    if (patientEmail) emails.push(sendEmail(patientEmail, subjects[event], bodyFor("Patient")));
    if (doctorEmail)  emails.push(sendEmail(doctorEmail,  subjects[event], bodyFor(`Dr. ${doctorName}`)));
    if (clinicEmail)  emails.push(sendEmail(clinicEmail,  subjects[event], bodyFor("Clinic")));

    await Promise.allSettled(emails); // Don't fail the request if email fails
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT — BOOK APPOINTMENT
// ─────────────────────────────────────────────────────────────────────────────

export const bookAppointment = async (req, res) => {
    try {
        const patientId = req.user.userId;

        const { clinic_id, doctor_id, appointment_date, appointment_time, reason, website_url } = req.body;
        const payment_mode = parsePaymentMode(req.body.payment_mode);

        if (!clinic_id || !doctor_id || !appointment_date || !appointment_time) {
            return res.status(400).json({ success: false, message: "clinic_id, doctor_id, appointment_date, and appointment_time are required" });
        }

        if (payment_mode === null) {
            return res.status(400).json({
                success: false,
                message: `payment_mode must be "${PAYMENT_MODES.PREPAYMENT}" or "${PAYMENT_MODES.PAY_LATER}"`,
            });
        }

        if (payment_mode === PAYMENT_MODES.PREPAYMENT && !website_url) {
            return res.status(400).json({
                success: false,
                message: "website_url is required when payment_mode is Prepayment",
            });
        }

        // ── Same-day or next-day only ──────────────────────────────────────────
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const apptDate = new Date(`${appointment_date}T00:00:00`);
        if (apptDate < today || apptDate > tomorrow) {
            return res.status(400).json({ success: false, message: "Appointments can only be booked for today or tomorrow" });
        }

        // ── Prevent past time ──────────────────────────────────────────────────
        const now = new Date();
        const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}`);
        if (appointmentDateTime <= now) {
            return res.status(400).json({ success: false, message: "Cannot book appointment in the past" });
        }

        // ── Validate clinic ────────────────────────────────────────────────────
        const [clinicRows] = await pool.query(
            `SELECT c.*, u.email AS doctor_email, u.first_name AS doctor_first, u.last_name AS doctor_last
             FROM clinics c
             JOIN users u ON c.doctor_id = u.id
             WHERE c.id = ? AND c.is_active = 1`,
            [clinic_id]
        );
        if (clinicRows.length === 0) {
            return res.status(404).json({ success: false, message: "Clinic not found or inactive" });
        }
        const clinic = clinicRows[0];

        // ── Validate doctor works at this clinic ───────────────────────────────
        const doctorAtClinic = await isDoctorAtClinic(clinic_id, parseInt(doctor_id));
        if (!doctorAtClinic) {
            return res.status(400).json({ success: false, message: "The selected doctor does not work at this clinic" });
        }

        // ── Get doctor info ────────────────────────────────────────────────────
        const [doctorRows] = await pool.query(
            `SELECT id, first_name, last_name, email FROM users WHERE id = ? AND role = 'doctor'`,
            [doctor_id]
        );
        if (doctorRows.length === 0) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }
        const doctor = doctorRows[0];

        // ── Check clinic holiday ───────────────────────────────────────────────
        const [holidayRows] = await pool.query(
            `SELECT id FROM clinic_holidays WHERE clinic_id = ? AND holiday_date = ?`,
            [clinic_id, appointment_date]
        );
        if (holidayRows.length > 0) {
            return res.status(400).json({ success: false, message: "Clinic is closed on the selected date (holiday)" });
        }

        // ── Check clinic weekly schedule ───────────────────────────────────────
        const dayName = new Date(`${appointment_date}T12:00:00`).toLocaleString("en-US", { weekday: "long" }).toLowerCase();
        const [scheduleRows] = await pool.query(
            `SELECT * FROM clinic_schedules WHERE clinic_id = ? AND day_of_week = ? AND is_closed = 0`,
            [clinic_id, dayName]
        );
        if (scheduleRows.length === 0) {
            return res.status(400).json({ success: false, message: "Clinic is closed on the selected day" });
        }
        const schedule = scheduleRows[0];

        const startTime = new Date(`${appointment_date}T${schedule.open_time}`);
        const endTime   = new Date(`${appointment_date}T${schedule.close_time}`);
        if (appointmentDateTime < startTime || appointmentDateTime >= endTime) {
            return res.status(400).json({ success: false, message: `Outside clinic working hours (${schedule.open_time} – ${schedule.close_time})` });
        }

        if (schedule.break_start && schedule.break_end) {
            const breakStart = new Date(`${appointment_date}T${schedule.break_start}`);
            const breakEnd   = new Date(`${appointment_date}T${schedule.break_end}`);
            if (appointmentDateTime >= breakStart && appointmentDateTime < breakEnd) {
                return res.status(400).json({ success: false, message: "Clinic is on break at the selected time" });
            }
        }

        // ── Check doctor's personal schedule ──────────────────────────────────
        const [docScheduleRows] = await pool.query(
            `SELECT * FROM doctor_schedules WHERE doctor_id = ? AND clinic_id = ? AND day_of_week = ? AND is_available = 1`,
            [doctor_id, clinic_id, dayName]
        );
        if (docScheduleRows.length > 0) {
            const ds = docScheduleRows[0];
            const dsStart = new Date(`${appointment_date}T${ds.start_time}`);
            const dsEnd   = new Date(`${appointment_date}T${ds.end_time}`);
            if (appointmentDateTime < dsStart || appointmentDateTime >= dsEnd) {
                return res.status(400).json({ success: false, message: `Doctor is not available at this time (${ds.start_time} – ${ds.end_time})` });
            }
            if (ds.break_start && ds.break_end) {
                const bS = new Date(`${appointment_date}T${ds.break_start}`);
                const bE = new Date(`${appointment_date}T${ds.break_end}`);
                if (appointmentDateTime >= bS && appointmentDateTime < bE) {
                    return res.status(400).json({ success: false, message: "Doctor is on break at the selected time" });
                }
            }
        }

        // ── Double booking check ───────────────────────────────────────────────
        const [existing] = await pool.query(
            `SELECT id FROM appointments
             WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?
             AND status IN ('pending','confirmed','rescheduled')`,
            [doctor_id, appointment_date, appointment_time]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: "This time slot is already booked" });
        }

        // ── One appointment per patient per doctor per day ─────────────────────
        const [patientDayAppt] = await pool.query(
            `SELECT id FROM appointments
             WHERE patient_id = ? AND doctor_id = ? AND appointment_date = ?
             AND status IN ('pending','confirmed','rescheduled')`,
            [patientId, doctor_id, appointment_date]
        );
        if (patientDayAppt.length > 0) {
            return res.status(409).json({
                success: false,
                message: "You already have an appointment with this doctor on the selected date",
            });
        }

        // ── Minimum gap check (10 minutes) ────────────────────────────────────
        const [sameDayAppts] = await pool.query(
            `SELECT appointment_time FROM appointments
             WHERE doctor_id = ? AND appointment_date = ? AND status IN ('pending','confirmed','rescheduled')`,
            [doctor_id, appointment_date]
        );
        const MIN_GAP_MS = 10 * 60 * 1000;
        for (const appt of sameDayAppts) {
            const existingTime = new Date(`${appointment_date}T${appt.appointment_time}`);
            if (Math.abs(appointmentDateTime - existingTime) < MIN_GAP_MS) {
                return res.status(400).json({ success: false, message: "Minimum 10-minute gap required between appointments" });
            }
        }

        // ── Generate token ─────────────────────────────────────────────────────
        const tokenNumber = await generateToken(clinic_id, appointment_date);

        // ── Insert appointment ─────────────────────────────────────────────────
        const [insertResult] = await pool.query(
            `INSERT INTO appointments
             (clinic_id, doctor_id, patient_id, appointment_date, appointment_time, reason, created_by, token_number, status, payment_mode)
             VALUES (?, ?, ?, ?, ?, ?, 'patient', ?, 'pending', ?)`,
            [clinic_id, doctor_id, patientId, appointment_date, appointment_time, reason || null, tokenNumber, payment_mode]
        );
        const appointmentId = insertResult.insertId;

        // ── Fetch patient info for email ───────────────────────────────────────
        const [patientRows] = await pool.query(
            `SELECT first_name, last_name, email FROM users WHERE id = ?`, [patientId]
        );
        const patient = patientRows[0] || {};

        // ── Send emails ────────────────────────────────────────────────────────
        await sendAppointmentEmails({
            event: "booked",
            appointment: {
                appointment_date,
                appointment_time,
                token_number: tokenNumber,
                reason,
                patient_first: patient.first_name,
                patient_last: patient.last_name,
                doctor_first: doctor.first_name,
                doctor_last: doctor.last_name,
                clinic_name: clinic.name,
            },
            patientEmail: patient.email,
            doctorEmail: doctor.email,
            clinicEmail: clinic.email,
        });

        const response = {
            success: true,
            message: "Appointment booked successfully",
            appointment_id: appointmentId,
            token_number: tokenNumber,
            payment_mode,
        };

        if (payment_mode === PAYMENT_MODES.PREPAYMENT) {
            try {
                const payment = await startKhaltiPaymentForAppointment({
                    appointmentId,
                    patientId,
                    websiteUrl: website_url,
                });
                response.payment_url = payment.payment_url;
                response.pidx = payment.pidx;
                response.amount = payment.amount;
                response.message = "Appointment booked. Complete prepayment via Khalti.";
            } catch (payErr) {
                console.error("bookAppointment prepayment:", payErr);
                response.payment_error = payErr.message || "Failed to initialize payment";
                response.message =
                    "Appointment booked but prepayment could not be started. Use POST /api/payment/initialize-khalti-payment.";
            }
        }

        return res.status(201).json(response);

    } catch (err) {
        console.error("bookAppointment:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT — GET MY APPOINTMENTS (with pagination + filters)
// ─────────────────────────────────────────────────────────────────────────────

export const getMyAppointments = async (req, res) => {
    try {
        const patientId = req.user.userId;
        const { start_date, end_date } = req.query;
        const { status, clinic_id } = req.query;
        const limit  = parseInt(req.query.limit)  || 10;
        const page   = parseInt(req.query.page)   || 1;
        const offset = (page > 0 ? page - 1 : 0) * limit;

        let baseWhere = `WHERE a.patient_id = ?`;
        const params = [patientId];

        if (start_date) { baseWhere += ` AND a.appointment_date >= ?`; params.push(start_date); }
        if (end_date)   { baseWhere += ` AND a.appointment_date <= ?`; params.push(end_date); }

        if (status)     { baseWhere += ` AND a.status = ?`;              params.push(status); }
        if (clinic_id)  { baseWhere += ` AND a.clinic_id = ?`;           params.push(clinic_id); }

        const countQuery = `SELECT COUNT(*) AS total FROM appointments a ${baseWhere}`;
        const [[{ total }]] = await pool.query(countQuery, params);

        const dataQuery = `
            SELECT a.*,
                   c.name AS clinic_name,
                   u.first_name AS doctor_first, u.last_name AS doctor_last,
                   p.price AS appointment_price
            FROM appointments a
            JOIN clinics c ON a.clinic_id = c.id
            JOIN users u   ON a.doctor_id = u.id
            LEFT JOIN pricing p ON p.clinic_id = a.clinic_id
            ${baseWhere}
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
            LIMIT ? OFFSET ?`;
        const [appointments] = await pool.query(dataQuery, [...params, limit, offset]);

        const total_pages  = total > 0 ? Math.ceil(total / limit) : 0;
        const current_page = total > 0 ? page : 0;

        const response = {
            success: true,
            total_data: total,
            total_pages,
            current_page,
            has_next_page: page < total_pages,
            count: appointments.length,
            appointments,
        };
        if (start_date) response.date_from = start_date;
        if (end_date) response.date_to = end_date;

        return res.status(200).json(response);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT — CANCEL APPOINTMENT
// ─────────────────────────────────────────────────────────────────────────────

export const cancelMyAppointment = async (req, res) => {
    try {
        const patientId = req.user.userId;
        const { id } = req.params;
        const reason = req.body?.reason ?? null;

        // ── Fetch appointment ──────────────────────────────────────────────────
        const [rows] = await pool.query(
            `SELECT a.*,
                    p.first_name AS patient_first, p.last_name AS patient_last, p.email AS patient_email,
                    d.first_name AS doctor_first, d.last_name AS doctor_last, d.email AS doctor_email,
                    c.name AS clinic_name, c.email AS clinic_email
             FROM appointments a
             JOIN users p ON a.patient_id = p.id
             JOIN users d ON a.doctor_id  = d.id
             JOIN clinics c ON a.clinic_id = c.id
             WHERE a.id = ? AND a.patient_id = ?`,
            [id, patientId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }
        const appt = rows[0];

        if (!["pending", "confirmed", "rescheduled"].includes(appt.status)) {
            return res.status(400).json({ success: false, message: `Cannot cancel an appointment with status '${appt.status}'` });
        }

        const dateStr = appt.appointment_date instanceof Date
            ? appt.appointment_date.toISOString().split("T")[0]
            : appt.appointment_date;

        // ── Update appointment ─────────────────────────────────────────────────
        await pool.query(
            `UPDATE appointments SET status = 'cancelled', cancellation_reason = ?, updated_at = NOW() WHERE id = ?`,
            [reason || null, id]
        );

        if (appt.slot_id) {
            await pool.query(
                `UPDATE generated_slots SET status = 'available', appointment_id = NULL WHERE id = ?`,
                [appt.slot_id]
            );
        }

        // ── Log ────────────────────────────────────────────────────────────────
        await pool.query(
            `INSERT INTO appointment_logs (appointment_id, changed_by, old_status, new_status, comment)
             VALUES (?, ?, ?, 'cancelled', ?)`,
            [id, patientId, appt.status, reason || null]
        );

        // ── Send emails ────────────────────────────────────────────────────────
        await sendAppointmentEmails({
            event: "cancelled",
            appointment: { ...appt, appointment_date: dateStr },
            patientEmail: appt.patient_email,
            doctorEmail: appt.doctor_email,
            clinicEmail: appt.clinic_email,
            reason: reason || null,
        });

        return res.status(200).json({
            success: true,
            message: "Appointment cancelled successfully",
        });

    } catch (err) {
        console.error("cancelMyAppointment:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT — GET MY PAYMENT HISTORY
// ─────────────────────────────────────────────────────────────────────────────

export { getPatientPaymentHistory as getMyPaymentHistory } from "./payment_history_controller.js";

// ─────────────────────────────────────────────────────────────────────────────
// RECEPTIONIST — BOOK APPOINTMENT ON BEHALF OF PATIENT
// ─────────────────────────────────────────────────────────────────────────────

export const bookAppointmentByReceptionist = async (req, res) => {
    try {
        const receptionistId = req.user.userId;

        const { clinic_id, doctor_id, patient_id, appointment_date, appointment_time, reason } = req.body;

        if (!clinic_id || !doctor_id || !patient_id || !appointment_date || !appointment_time) {
            return res.status(400).json({ success: false, message: "clinic_id, doctor_id, patient_id, appointment_date, appointment_time are required" });
        }

        // ── Verify receptionist works at this clinic ───────────────────────────
        const [staffRows] = await pool.query(
            `SELECT id FROM clinic_staff WHERE clinic_id = ? AND user_id = ? AND status = 'active'`,
            [clinic_id, receptionistId]
        );
        if (staffRows.length === 0) {
            return res.status(403).json({ success: false, message: "You are not an active receptionist at this clinic" });
        }

        // ── Same validations as patient booking ────────────────────────────────
        const now = new Date();
        const apptDate = new Date(`${appointment_date}T00:00:00`);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

        if (apptDate < today || apptDate > tomorrow) {
            return res.status(400).json({ success: false, message: "Appointments can only be booked for today or tomorrow" });
        }

        const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}`);
        if (appointmentDateTime <= now) {
            return res.status(400).json({ success: false, message: "Cannot book in the past" });
        }

        // ── Validate clinic ────────────────────────────────────────────────────
        const [clinicRows] = await pool.query(
            `SELECT c.*, u.email AS doctor_email, u.first_name AS doctor_first, u.last_name AS doctor_last
             FROM clinics c JOIN users u ON c.doctor_id = u.id
             WHERE c.id = ? AND c.is_active = 1`,
            [clinic_id]
        );
        if (clinicRows.length === 0) {
            return res.status(404).json({ success: false, message: "Clinic not found or inactive" });
        }
        const clinic = clinicRows[0];

        // ── Validate doctor at clinic ──────────────────────────────────────────
        if (!(await isDoctorAtClinic(clinic_id, parseInt(doctor_id)))) {
            return res.status(400).json({ success: false, message: "The selected doctor does not work at this clinic" });
        }

        const [doctorRows] = await pool.query(`SELECT first_name, last_name, email FROM users WHERE id = ?`, [doctor_id]);
        const doctor = doctorRows[0] || {};

        // ── Clinic holiday check ───────────────────────────────────────────────
        const [holidayRows] = await pool.query(
            `SELECT id FROM clinic_holidays WHERE clinic_id = ? AND holiday_date = ?`,
            [clinic_id, appointment_date]
        );
        if (holidayRows.length > 0) {
            return res.status(400).json({ success: false, message: "Clinic is closed on the selected date (holiday)" });
        }

        // ── Clinic schedule check ──────────────────────────────────────────────
        const dayName = new Date(`${appointment_date}T12:00:00`).toLocaleString("en-US", { weekday: "long" }).toLowerCase();
        const [scheduleRows] = await pool.query(
            `SELECT * FROM clinic_schedules WHERE clinic_id = ? AND day_of_week = ? AND is_closed = 0`,
            [clinic_id, dayName]
        );
        if (scheduleRows.length === 0) {
            return res.status(400).json({ success: false, message: "Clinic is closed on the selected day" });
        }
        const schedule = scheduleRows[0];

        const startTime = new Date(`${appointment_date}T${schedule.open_time}`);
        const endTime   = new Date(`${appointment_date}T${schedule.close_time}`);
        if (appointmentDateTime < startTime || appointmentDateTime >= endTime) {
            return res.status(400).json({ success: false, message: `Outside clinic working hours (${schedule.open_time} – ${schedule.close_time})` });
        }

        // ── Double booking ─────────────────────────────────────────────────────
        const [existing] = await pool.query(
            `SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN ('pending','confirmed','rescheduled')`,
            [doctor_id, appointment_date, appointment_time]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: "Time slot already booked" });
        }

        const [patientDayAppt] = await pool.query(
            `SELECT id FROM appointments
             WHERE patient_id = ? AND doctor_id = ? AND appointment_date = ?
             AND status IN ('pending','confirmed','rescheduled')`,
            [patient_id, doctor_id, appointment_date]
        );
        if (patientDayAppt.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This patient already has an appointment with this doctor on the selected date",
            });
        }

        // ── 10-minute gap ──────────────────────────────────────────────────────
        const [sameDayAppts] = await pool.query(
            `SELECT appointment_time FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status IN ('pending','confirmed','rescheduled')`,
            [doctor_id, appointment_date]
        );
        const MIN_GAP_MS = 10 * 60 * 1000;
        for (const a of sameDayAppts) {
            const t = new Date(`${appointment_date}T${a.appointment_time}`);
            if (Math.abs(appointmentDateTime - t) < MIN_GAP_MS) {
                return res.status(400).json({ success: false, message: "Minimum 10-minute gap required between appointments" });
            }
        }

        // ── Generate token & insert ────────────────────────────────────────────
        const tokenNumber = await generateToken(clinic_id, appointment_date);

        const [insertResult] = await pool.query(
            `INSERT INTO appointments
             (clinic_id, doctor_id, patient_id, receptionist_id, appointment_date, appointment_time, reason, created_by, token_number, status, payment_mode)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'receptionist', ?, 'pending', ?)`,
            [clinic_id, doctor_id, patient_id, receptionistId, appointment_date, appointment_time, reason || null, tokenNumber, PAYMENT_MODES.PAY_LATER]
        );

        // ── Fetch patient for email ────────────────────────────────────────────
        const [patientRows] = await pool.query(`SELECT first_name, last_name, email FROM users WHERE id = ?`, [patient_id]);
        const patient = patientRows[0] || {};

        await sendAppointmentEmails({
            event: "booked",
            appointment: {
                appointment_date, appointment_time, token_number: tokenNumber, reason,
                patient_first: patient.first_name, patient_last: patient.last_name,
                doctor_first: doctor.first_name, doctor_last: doctor.last_name,
                clinic_name: clinic.name,
            },
            patientEmail: patient.email,
            doctorEmail: doctor.email,
            clinicEmail: clinic.email,
        });

        return res.status(201).json({
            success: true,
            message: "Appointment booked successfully",
            appointment_id: insertResult.insertId,
            token_number: tokenNumber,
            payment_mode: PAYMENT_MODES.PAY_LATER,
        });

    } catch (err) {
        console.error("bookAppointmentByReceptionist:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// RECEPTIONIST — GET CLINIC APPOINTMENTS (paginated + filters)
// ─────────────────────────────────────────────────────────────────────────────

export const getClinicAppointments = async (req, res) => {
    try {
        const receptionistId = req.user.userId;
        const { clinic_id } = req.params;
        const today = new Date().toISOString().split("T")[0];
        const start_date = req.query.start_date || today;
        const end_date   = req.query.end_date   || today;
        const { status, doctor_id, search, patient_id } = req.query;
        const limit  = parseInt(req.query.limit)  || 10;
        const page   = parseInt(req.query.page)   || 1;
        const offset = (page > 0 ? page - 1 : 0) * limit;

        // Verify receptionist works at this clinic
        const [staffRows] = await pool.query(
            `SELECT id FROM clinic_staff WHERE clinic_id = ? AND user_id = ? AND status = 'active'`,
            [clinic_id, receptionistId]
        );
        if (staffRows.length === 0) {
            return res.status(403).json({ success: false, message: "Not authorized for this clinic" });
        }

        let baseWhere = `WHERE a.clinic_id = ?`;
        const params = [clinic_id];

        baseWhere += ` AND a.appointment_date >= ? AND a.appointment_date <= ?`;
        params.push(start_date, end_date);

        if (status)     { baseWhere += ` AND a.status = ?`;              params.push(status); }
        if (doctor_id)  { baseWhere += ` AND a.doctor_id = ?`;           params.push(doctor_id); }
        if (patient_id) { baseWhere += ` AND a.patient_id = ?`;           params.push(patient_id); }
        if (search) {
            baseWhere += ` AND (CONCAT(p.first_name, ' ', p.last_name) LIKE ? OR p.email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM appointments a
             JOIN users p ON a.patient_id = p.id
             ${baseWhere}`, params
        );

        const [appointments] = await pool.query(
            `SELECT a.*,
                    p.first_name AS patient_first, p.last_name AS patient_last, p.email AS patient_email,
                    d.first_name AS doctor_first, d.last_name AS doctor_last
             FROM appointments a
             JOIN users p ON a.patient_id = p.id
             JOIN users d ON a.doctor_id  = d.id
             ${baseWhere}
             ORDER BY a.appointment_date DESC, a.appointment_time ASC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const total_pages = total > 0 ? Math.ceil(total / limit) : 0;
        return res.status(200).json({
            success: true,
            date_from: start_date,
            date_to: end_date,
            total_data: total, total_pages,
            current_page: total > 0 ? page : 0,
            has_next_page: page < total_pages,
            count: appointments.length,
            appointments,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// RECEPTIONIST — CONFIRM APPOINTMENT
// ─────────────────────────────────────────────────────────────────────────────

export const confirmAppointment = async (req, res) => {
    try {
        const receptionistId = req.user.userId;
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT a.*,
                    p.first_name AS patient_first, p.last_name AS patient_last, p.email AS patient_email,
                    d.first_name AS doctor_first, d.last_name AS doctor_last, d.email AS doctor_email,
                    c.name AS clinic_name, c.email AS clinic_email
             FROM appointments a
             JOIN users p ON a.patient_id = p.id
             JOIN users d ON a.doctor_id  = d.id
             JOIN clinics c ON a.clinic_id = c.id
             WHERE a.id = ?`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Appointment not found" });

        const appt = rows[0];

        // Ensure receptionist works at this clinic
        const [staffRows] = await pool.query(
            `SELECT id FROM clinic_staff WHERE clinic_id = ? AND user_id = ? AND status = 'active'`,
            [appt.clinic_id, receptionistId]
        );
        if (staffRows.length === 0) {
            return res.status(403).json({ success: false, message: "You are not an active receptionist at this clinic" });
        }

        if (!["pending", "rescheduled"].includes(appt.status)) {
            return res.status(400).json({ success: false, message: `Cannot confirm appointment with status '${appt.status}'` });
        }

        await pool.query(
            `UPDATE appointments SET status = 'confirmed', receptionist_id = ?, updated_at = NOW() WHERE id = ?`,
            [receptionistId, id]
        );

        await pool.query(
            `INSERT INTO appointment_logs (appointment_id, changed_by, old_status, new_status)
             VALUES (?, ?, ?, 'confirmed')`,
            [id, receptionistId, appt.status]
        );

        const dateStr = appt.appointment_date instanceof Date
            ? appt.appointment_date.toISOString().split("T")[0]
            : appt.appointment_date;

        await sendAppointmentEmails({
            event: "confirmed",
            appointment: { ...appt, appointment_date: dateStr },
            patientEmail: appt.patient_email,
        });

        return res.json({ success: true, message: "Appointment confirmed" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// RECEPTIONIST — REJECT APPOINTMENT
// ─────────────────────────────────────────────────────────────────────────────

export const rejectAppointment = async (req, res) => {
    try {
        const receptionistId = req.user.userId;
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) return res.status(400).json({ success: false, message: "Rejection reason is required" });

        const [rows] = await pool.query(
            `SELECT a.*,
                    p.email AS patient_email,
                    p.first_name AS patient_first, p.last_name AS patient_last,
                    d.first_name AS doctor_first, d.last_name AS doctor_last,
                    c.name AS clinic_name, c.email AS clinic_email
             FROM appointments a
             JOIN users p ON a.patient_id = p.id
             JOIN users d ON a.doctor_id  = d.id
             JOIN clinics c ON a.clinic_id = c.id
             WHERE a.id = ?`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Appointment not found" });

        const appt = rows[0];

        // Ensure receptionist works at this clinic
        const [staffRows] = await pool.query(
            `SELECT id FROM clinic_staff WHERE clinic_id = ? AND user_id = ? AND status = 'active'`,
            [appt.clinic_id, receptionistId]
        );
        if (staffRows.length === 0) {
            return res.status(403).json({ success: false, message: "You are not an active receptionist at this clinic" });
        }

        if (!["pending", "confirmed", "rescheduled"].includes(appt.status)) {
            return res.status(400).json({ success: false, message: `Cannot reject appointment with status '${appt.status}'` });
        }

        await pool.query(
            `UPDATE appointments SET status = 'rejected', receptionist_id = ?, cancellation_reason = ?, updated_at = NOW() WHERE id = ?`,
            [receptionistId, reason, id]
        );

        if (appt.slot_id) {
            await pool.query(
                `UPDATE generated_slots SET status = 'available', appointment_id = NULL WHERE id = ?`,
                [appt.slot_id]
            );
        }

        await pool.query(
            `INSERT INTO appointment_logs (appointment_id, changed_by, old_status, new_status, comment)
             VALUES (?, ?, ?, 'rejected', ?)`,
            [id, receptionistId, appt.status, reason]
        );

        const dateStr = appt.appointment_date instanceof Date
            ? appt.appointment_date.toISOString().split("T")[0]
            : appt.appointment_date;

        await sendAppointmentEmails({
            event: "rejected",
            appointment: { ...appt, appointment_date: dateStr },
            patientEmail: appt.patient_email,
            reason,
        });

        return res.json({ success: true, message: "Appointment rejected" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR — GET MY APPOINTMENTS (today default, date range optional, paginated)
// ─────────────────────────────────────────────────────────────────────────────

export const getDoctorAppointments = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { status, clinic_id, search } = req.query;
        const limit  = parseInt(req.query.limit)  || 10;
        const page   = parseInt(req.query.page)   || 1;
        const offset = (page > 0 ? page - 1 : 0) * limit;

        // If no dates provided → today
        const start_date = req.query.start_date || new Date().toISOString().split("T")[0];
        const end_date   = req.query.end_date   || new Date().toISOString().split("T")[0];

        let baseWhere = `WHERE a.doctor_id = ? AND a.appointment_date >= ? AND a.appointment_date <= ?`;
        const params  = [doctorId, start_date, end_date];

        if (status)    { baseWhere += ` AND a.status = ?`;              params.push(status); }
        if (clinic_id) { baseWhere += ` AND a.clinic_id = ?`;           params.push(clinic_id); }
        if (search) {
            baseWhere += ` AND (CONCAT(p.first_name, ' ', p.last_name) LIKE ? OR p.email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM appointments a JOIN users p ON a.patient_id = p.id ${baseWhere}`, params
        );

        const [appointments] = await pool.query(
            `SELECT a.*,
                    p.first_name AS patient_first, p.last_name AS patient_last, p.email AS patient_email, p.phone_number AS patient_phone,
                    c.name AS clinic_name, c.email AS clinic_email,
                    pr.price AS appointment_price
             FROM appointments a
             JOIN users p    ON a.patient_id = p.id
             JOIN clinics c  ON a.clinic_id  = c.id
             LEFT JOIN pricing pr ON pr.clinic_id = a.clinic_id
             ${baseWhere}
             ORDER BY a.appointment_date ASC, a.appointment_time ASC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const total_pages = total > 0 ? Math.ceil(total / limit) : 0;
        return res.status(200).json({
            success: true,
            date_from: start_date, date_to: end_date,
            total_data: total, total_pages,
            current_page: total > 0 ? page : 0,
            has_next_page: page < total_pages,
            count: appointments.length,
            appointments,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR — CONFIRM APPOINTMENT
// ─────────────────────────────────────────────────────────────────────────────

export const doctorConfirmAppointment = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT a.*,
                    p.first_name AS patient_first, p.last_name AS patient_last, p.email AS patient_email,
                    d.first_name AS doctor_first, d.last_name AS doctor_last, d.email AS doctor_email,
                    c.name AS clinic_name, c.email AS clinic_email
             FROM appointments a
             JOIN users p ON a.patient_id = p.id
             JOIN users d ON a.doctor_id  = d.id
             JOIN clinics c ON a.clinic_id = c.id
             WHERE a.id = ? AND a.doctor_id = ?`,
            [id, doctorId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Appointment not found or not yours" });
        }
        const appt = rows[0];

        if (!["pending", "rescheduled"].includes(appt.status)) {
            return res.status(400).json({ success: false, message: `Cannot confirm appointment with status '${appt.status}'` });
        }

        await pool.query(`UPDATE appointments SET status = 'confirmed', updated_at = NOW() WHERE id = ?`, [id]);
        await pool.query(
            `INSERT INTO appointment_logs (appointment_id, changed_by, old_status, new_status) VALUES (?, ?, ?, 'confirmed')`,
            [id, doctorId, appt.status]
        );

        const dateStr = appt.appointment_date instanceof Date
            ? appt.appointment_date.toISOString().split("T")[0]
            : appt.appointment_date;

        await sendAppointmentEmails({
            event: "confirmed",
            appointment: { ...appt, appointment_date: dateStr },
            patientEmail: appt.patient_email,
            doctorEmail: appt.doctor_email,
            clinicEmail: appt.clinic_email,
        });

        return res.json({ success: true, message: "Appointment confirmed" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR — CANCEL APPOINTMENT
// ─────────────────────────────────────────────────────────────────────────────

export const doctorCancelAppointment = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) return res.status(400).json({ success: false, message: "Cancellation reason is required" });

        const [rows] = await pool.query(
            `SELECT a.*,
                    p.first_name AS patient_first, p.last_name AS patient_last, p.email AS patient_email,
                    d.first_name AS doctor_first, d.last_name AS doctor_last, d.email AS doctor_email,
                    c.name AS clinic_name, c.email AS clinic_email
             FROM appointments a
             JOIN users p ON a.patient_id = p.id
             JOIN users d ON a.doctor_id  = d.id
             JOIN clinics c ON a.clinic_id = c.id
             WHERE a.id = ? AND a.doctor_id = ?`,
            [id, doctorId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Appointment not found or not yours" });
        }
        const appt = rows[0];

        if (!["pending", "confirmed", "rescheduled"].includes(appt.status)) {
            return res.status(400).json({ success: false, message: `Cannot cancel appointment with status '${appt.status}'` });
        }

        await pool.query(
            `UPDATE appointments SET status = 'cancelled', cancellation_reason = ?, rescheduled_by = ?, updated_at = NOW() WHERE id = ?`,
            [reason, doctorId, id]
        );

        if (appt.slot_id) {
            await pool.query(
                `UPDATE generated_slots SET status = 'available', appointment_id = NULL WHERE id = ?`,
                [appt.slot_id]
            );
        }
        await pool.query(
            `INSERT INTO appointment_logs (appointment_id, changed_by, old_status, new_status, comment) VALUES (?, ?, ?, 'cancelled', ?)`,
            [id, doctorId, appt.status, reason]
        );

        const dateStr = appt.appointment_date instanceof Date
            ? appt.appointment_date.toISOString().split("T")[0]
            : appt.appointment_date;

        await sendAppointmentEmails({
            event: "cancelled",
            appointment: { ...appt, appointment_date: dateStr },
            patientEmail: appt.patient_email,
            doctorEmail: appt.doctor_email,
            clinicEmail: appt.clinic_email,
            reason,
        });

        return res.json({ success: true, message: "Appointment cancelled" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR — RESCHEDULE APPOINTMENT
// ─────────────────────────────────────────────────────────────────────────────

export const doctorRescheduleAppointment = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { id } = req.params;
        const { new_date, new_time, reason } = req.body;

        if (!new_date || !new_time || !reason) {
            return res.status(400).json({ success: false, message: "new_date, new_time, and reason are required" });
        }

        const [rows] = await pool.query(
            `SELECT a.*,
                    p.first_name AS patient_first, p.last_name AS patient_last, p.email AS patient_email,
                    d.first_name AS doctor_first, d.last_name AS doctor_last, d.email AS doctor_email,
                    c.name AS clinic_name, c.email AS clinic_email
             FROM appointments a
             JOIN users p ON a.patient_id = p.id
             JOIN users d ON a.doctor_id  = d.id
             JOIN clinics c ON a.clinic_id = c.id
             WHERE a.id = ? AND a.doctor_id = ?`,
            [id, doctorId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Appointment not found or not yours" });
        }
        const appt = rows[0];

        if (["cancelled", "completed"].includes(appt.status)) {
            return res.status(400).json({ success: false, message: `Cannot reschedule appointment with status '${appt.status}'` });
        }

        // Check new slot availability
        const [slotConflict] = await pool.query(
            `SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN ('pending','confirmed') AND id != ?`,
            [doctorId, new_date, new_time, id]
        );
        if (slotConflict.length > 0) {
            return res.status(409).json({ success: false, message: "The new time slot is already booked" });
        }

        // Check clinic holiday on new date
        const [holidayRows] = await pool.query(
            `SELECT id FROM clinic_holidays WHERE clinic_id = ? AND holiday_date = ?`,
            [appt.clinic_id, new_date]
        );
        if (holidayRows.length > 0) {
            return res.status(400).json({ success: false, message: "Clinic is closed on the new date (holiday)" });
        }

        // Generate new token for new date
        const newToken = await generateToken(appt.clinic_id, new_date);

        const oldDateStr = appt.appointment_date instanceof Date
            ? appt.appointment_date.toISOString().split("T")[0]
            : appt.appointment_date;

        await pool.query(
            `UPDATE appointments SET
               status = 'rescheduled',
               appointment_date = ?,
               appointment_time = ?,
               rescheduled_date = ?,
               rescheduled_time = ?,
               rescheduled_by = ?,
               token_number = ?,
               cancellation_reason = ?,
               updated_at = NOW()
             WHERE id = ?`,
            [new_date, new_time, new_date, new_time, doctorId, newToken, reason, id]
        );

        await pool.query(
            `INSERT INTO appointment_logs (appointment_id, changed_by, old_status, new_status, comment)
             VALUES (?, ?, ?, 'rescheduled', ?)`,
            [id, doctorId, appt.status, `Rescheduled from ${oldDateStr} ${appt.appointment_time} to ${new_date} ${new_time}. Reason: ${reason}`]
        );

        await sendAppointmentEmails({
            event: "rescheduled",
            appointment: {
                ...appt,
                appointment_date: new_date,
                appointment_time: new_time,
                token_number: newToken,
            },
            patientEmail: appt.patient_email,
            doctorEmail: appt.doctor_email,
            clinicEmail: appt.clinic_email,
            reason: `Previous: ${oldDateStr} at ${appt.appointment_time}. New: ${new_date} at ${new_time}. Reason: ${reason}`,
        });

        return res.json({
            success: true,
            message: "Appointment rescheduled",
            new_token: newToken,
            new_date,
            new_time,
        });
    } catch (err) {
        console.error("doctorRescheduleAppointment:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR / RECEPTIONIST — MARK APPOINTMENT COMPLETE
// ─────────────────────────────────────────────────────────────────────────────

export const completeAppointment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const { id } = req.params;
        const note = req.body?.note;

        if (!note || !String(note).trim()) {
            return res.status(400).json({ success: false, message: "note is required" });
        }

        const [rows] = await pool.query(
            `SELECT a.*,
                    p.email AS patient_email,
                    p.first_name AS patient_first, p.last_name AS patient_last,
                    d.email AS doctor_email,
                    d.first_name AS doctor_first, d.last_name AS doctor_last,
                    c.name AS clinic_name, c.email AS clinic_email
             FROM appointments a
             JOIN users p ON a.patient_id = p.id
             JOIN users d ON a.doctor_id = d.id
             JOIN clinics c ON a.clinic_id = c.id
             WHERE a.id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }
        const appt = rows[0];

        if (role === "doctor" && appt.doctor_id !== userId) {
            return res.status(403).json({ success: false, message: "This appointment is not assigned to you" });
        }

        if (role === "receptionist") {
            const [staffRows] = await pool.query(
                `SELECT id FROM clinic_staff WHERE clinic_id = ? AND user_id = ? AND status = 'active'`,
                [appt.clinic_id, userId]
            );
            if (staffRows.length === 0) {
                return res.status(403).json({ success: false, message: "You are not an active receptionist at this clinic" });
            }
        }

        if (!["pending", "confirmed", "rescheduled"].includes(appt.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot complete appointment with status '${appt.status}'`,
            });
        }

        await pool.query(
            `UPDATE appointments SET status = 'completed', notes = ?, updated_at = NOW() WHERE id = ?`,
            [note.trim(), id]
        );

        await pool.query(
            `INSERT INTO appointment_logs (appointment_id, changed_by, old_status, new_status, comment)
             VALUES (?, ?, ?, 'completed', ?)`,
            [id, userId, appt.status, note.trim()]
        );

        return res.status(200).json({
            success: true,
            message: "Appointment marked as completed",
            appointment_id: parseInt(id),
            status: "completed",
        });
    } catch (err) {
        console.error("completeAppointment:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// LIVE TOKEN STATUS (Patient — must have appointment today at this clinic)
// ─────────────────────────────────────────────────────────────────────────────

export const getClinicTokenStatus = async (req, res) => {
    try {
        const patientId = req.user.userId;
        const { clinic_id } = req.params;
        const today = getTodayLocal();

        // Find patient's active appointment today at this clinic
        const [myAppts] = await pool.query(
            `SELECT id, token_number, status, appointment_time FROM appointments
             WHERE patient_id = ? AND clinic_id = ? AND appointment_date = ?
             AND status IN ('pending','confirmed','rescheduled')
             ORDER BY appointment_time ASC LIMIT 1`,
            [patientId, clinic_id, today]
        );

        if (myAppts.length === 0) {
            return res.status(404).json({
                success: false,
                message: "You have no active appointment at this clinic today",
            });
        }

        const myAppt = myAppts[0];

        if (!myAppt.token_number) {
            return res.status(400).json({
                success: false,
                message: "Token number is not assigned for your appointment",
            });
        }

        // Current token being served: earliest active token today
        const [currentRows] = await pool.query(
            `SELECT token_number FROM appointments
             WHERE clinic_id = ? AND appointment_date = ? AND status IN ('pending','confirmed','rescheduled')
             AND token_number IS NOT NULL
             ORDER BY token_number ASC LIMIT 1`,
            [clinic_id, today]
        );
        const currentToken = currentRows.length > 0 ? currentRows[0].token_number : null;

        // Appointments ahead of you (by token order)
        const [aheadRows] = await pool.query(
            `SELECT COUNT(*) AS cnt FROM appointments
             WHERE clinic_id = ? AND appointment_date = ?
             AND status IN ('pending','confirmed','rescheduled')
             AND token_number IS NOT NULL AND token_number < ?`,
            [clinic_id, today, myAppt.token_number]
        );
        const appointmentsAhead = aheadRows[0].cnt;

        return res.status(200).json({
            success: true,
            current_token: currentToken,
            your_token: myAppt.token_number,
            appointments_ahead: appointmentsAhead,
            your_appointment_id: myAppt.id,
            your_status: myAppt.status,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};