import { pool } from "../config/db_config.js";

export const bookAppointment = async (req, res) => {
    try {
        const patientId = req.user.userId;

        const {
            clinic_id,
            appointment_date,
            appointment_time,
            reason
        } = req.body;

        if (!clinic_id || !appointment_date || !appointment_time) {
            return res.status(400).json({
                success: false,
                message: "Required fields missing"
            });
        }

        // ---------------- CURRENT TIME ----------------
        const now = new Date();
        const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}`);

        // Prevent past booking
        if (appointmentDateTime <= now) {
            return res.status(400).json({
                success: false,
                message: "Cannot book appointment in the past"
            });
        }

        // ---------------- GET CLINIC ----------------
        const [clinicRows] = await pool.query(
            `SELECT * FROM clinics WHERE id = ? AND is_active = TRUE`,
            [clinic_id]
        );

        if (clinicRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Clinic not found or inactive"
            });
        }

        const clinic = clinicRows[0];
        const doctorId = clinic.doctor_id;

        // ---------------- GET DAY NAME (FULL FORMAT) ----------------
        const dayName = new Date(appointment_date)
            .toLocaleString("en-US", { weekday: "long" })
            .toLowerCase(); // monday, tuesday...

        // ---------------- CHECK CLINIC SCHEDULE ----------------
        const [scheduleRows] = await pool.query(
            `SELECT * FROM clinic_schedules 
             WHERE clinic_id = ? AND day_of_week = ? AND is_closed = FALSE`,
            [clinic_id, dayName]
        );

        if (scheduleRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Clinic is closed on selected day"
            });
        }

        const schedule = scheduleRows[0];

        const startTime = new Date(`${appointment_date}T${schedule.open_time}`);
        const endTime = new Date(`${appointment_date}T${schedule.close_time}`);

        // Outside working hours
        if (appointmentDateTime < startTime || appointmentDateTime >= endTime) {
            return res.status(400).json({
                success: false,
                message: "Outside clinic working hours"
            });
        }

        // ---------------- BREAK TIME CHECK ----------------
        if (schedule.break_start && schedule.break_end) {
            const breakStart = new Date(`${appointment_date}T${schedule.break_start}`);
            const breakEnd = new Date(`${appointment_date}T${schedule.break_end}`);

            if (appointmentDateTime >= breakStart && appointmentDateTime < breakEnd) {
                return res.status(400).json({
                    success: false,
                    message: "Clinic is on break at selected time"
                });
            }
        }

        // ---------------- DOUBLE BOOKING (STRICT) ----------------
        const [existing] = await pool.query(
            `SELECT id FROM appointments 
             WHERE doctor_id = ? 
             AND appointment_date = ? 
             AND appointment_time = ?
             AND status IN ('pending','confirmed')`,
            [doctorId, appointment_date, appointment_time]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "This time slot is already booked"
            });
        }

        // ---------------- MIN GAP CHECK (9 min 59 sec) ----------------
        const [sameDayAppointments] = await pool.query(
            `SELECT appointment_time FROM appointments
             WHERE doctor_id = ?
             AND appointment_date = ?
             AND status IN ('pending','confirmed')`,
            [doctorId, appointment_date]
        );

        const MIN_GAP_MS = (9 * 60 + 59) * 1000; // 9m 59s

        for (const appt of sameDayAppointments) {
            const existingTime = new Date(`${appointment_date}T${appt.appointment_time}`);
            const diff = Math.abs(appointmentDateTime - existingTime);

            if (diff <= MIN_GAP_MS) {
                return res.status(400).json({
                    success: false,
                    message: "Minimum 10 minutes gap required between appointments"
                });
            }
        }

        // ---------------- INSERT ----------------
        await pool.query(
            `INSERT INTO appointments 
            (clinic_id, doctor_id, patient_id, appointment_date, appointment_time, reason, created_by)
            VALUES (?, ?, ?, ?, ?, ?, 'patient')`,
            [
                clinic_id,
                doctorId,
                patientId,
                appointment_date,
                appointment_time,
                reason || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Appointment booked successfully"
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getClinicAppointments = async (req, res) => {
    try {
        const receptionistId = req.user.userId;
        const { clinic_id } = req.params;

        const [apps] = await pool.query(
            `SELECT a.*, 
                    p.first_name AS patient_first,
                    p.last_name AS patient_last
             FROM appointments a
             JOIN users p ON a.patient_id = p.id
             WHERE a.clinic_id = ?
             ORDER BY a.appointment_date DESC`,
            [clinic_id]
        );

        return res.status(200).json({
            success: true,
            appointments: apps
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const confirmAppointment = async (req, res) => {
    try {
        const receptionistId = req.user.userId;
        const { id } = req.params;

        await pool.query(
            `UPDATE appointments 
             SET status = 'confirmed', receptionist_id = ?
             WHERE id = ?`,
            [receptionistId, id]
        );

        await pool.query(
            `INSERT INTO appointment_logs 
             (appointment_id, changed_by, old_status, new_status)
             VALUES (?, ?, 'pending', 'confirmed')`,
            [id, receptionistId]
        );

        return res.json({
            success: true,
            message: "Appointment confirmed"
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const rejectAppointment = async (req, res) => {
    try {
        const receptionistId = req.user.userId;
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: "Rejection reason required"
            });
        }

        // 1. CHECK APPOINTMENT EXISTS FIRST
        const [appointments] = await pool.query(
            `SELECT * FROM appointments WHERE id = ?`,
            [id]
        );

        if (appointments.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        const appointment = appointments[0];

        // 2. UPDATE APPOINTMENT FIRST
        await pool.query(
            `UPDATE appointments 
             SET status = 'rejected', receptionist_id = ?
             WHERE id = ?`,
            [receptionistId, id]
        );

        // 3. THEN INSERT LOG (SAFE)
        await pool.query(
            `INSERT INTO appointment_logs 
             (appointment_id, changed_by, old_status, new_status, comment)
             VALUES (?, ?, ?, 'rejected', ?)`,
            [
                id,
                receptionistId,
                appointment.status,
                reason
            ]
        );

        return res.json({
            success: true,
            message: "Appointment rejected"
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getDoctorAppointments = async (req, res) => {
    try {
        const doctorId = req.user.userId;

        const [apps] = await pool.query(
            `SELECT a.*, 
                    p.first_name AS patient_name,
                    c.name AS clinic_name
             FROM appointments a
             JOIN users p ON a.patient_id = p.id
             JOIN clinics c ON a.clinic_id = c.id
             WHERE a.doctor_id = ?
             ORDER BY a.appointment_date DESC`,
            [doctorId]
        );

        return res.json({
            success: true,
            appointments: apps
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const getMyAppointments = async (req, res) => {
    try {
        const patientId = req.user.userId;

        const [apps] = await pool.query(
            `SELECT a.*, c.name AS clinic_name
             FROM appointments a
             JOIN clinics c ON a.clinic_id = c.id
             WHERE a.patient_id = ?
             ORDER BY a.appointment_date DESC`,
            [patientId]
        );

        return res.json({
            success: true,
            appointments: apps
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};