import { pool } from "../config/db_config.js";

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR — UPSERT WEEKLY SCHEDULE AT CLINIC
// ─────────────────────────────────────────────────────────────────────────────
export const upsertDoctorSchedule = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { clinic_id } = req.params;
        const { schedules } = req.body;

        if (!Array.isArray(schedules) || schedules.length === 0) {
            return res.status(400).json({ success: false, message: "schedules array is required" });
        }

        // Verify doctor works at this clinic (either owner or associate)
        const [clinicRows] = await pool.query(
            `SELECT doctor_id FROM clinics WHERE id = ?`,
            [clinic_id]
        );
        if (clinicRows.length === 0) {
            return res.status(404).json({ success: false, message: "Clinic not found" });
        }

        let isAuthorized = clinicRows[0].doctor_id === doctorId;

        if (!isAuthorized) {
            const [assocRows] = await pool.query(
                `SELECT id FROM clinic_doctors WHERE clinic_id = ? AND doctor_id = ? AND is_active = 1`,
                [clinic_id, doctorId]
            );
            if (assocRows.length > 0) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: "You are not authorized to schedule for this clinic" });
        }

        // Upsert schedules
        for (const s of schedules) {
            const {
                day_of_week,
                is_available,
                start_time,
                end_time,
                break_start,
                break_end,
                slot_duration_minutes
            } = s;

            if (!day_of_week || !start_time || !end_time) {
                return res.status(400).json({
                    success: false,
                    message: "day_of_week, start_time, and end_time are required for all schedules"
                });
            }

            await pool.query(
                `INSERT INTO doctor_schedules 
                    (doctor_id, clinic_id, day_of_week, is_available, start_time, end_time, break_start, break_end, slot_duration_minutes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    is_available = VALUES(is_available),
                    start_time = VALUES(start_time),
                    end_time = VALUES(end_time),
                    break_start = VALUES(break_start),
                    break_end = VALUES(break_end),
                    slot_duration_minutes = VALUES(slot_duration_minutes)`,
                [
                    doctorId,
                    clinic_id,
                    day_of_week,
                    is_available ?? true,
                    start_time,
                    end_time,
                    break_start || null,
                    break_end || null,
                    slot_duration_minutes ?? 15
                ]
            );
        }

        return res.status(200).json({ success: true, message: "Doctor schedule updated successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

async function assertDoctorAtClinic(doctorId, clinic_id) {
    const [clinicRows] = await pool.query(`SELECT doctor_id FROM clinics WHERE id = ?`, [clinic_id]);
    if (clinicRows.length === 0) {
        const err = new Error("Clinic not found");
        err.statusCode = 404;
        throw err;
    }
    if (clinicRows[0].doctor_id === doctorId) return;

    const [assocRows] = await pool.query(
        `SELECT id FROM clinic_doctors WHERE clinic_id = ? AND doctor_id = ? AND is_active = 1`,
        [clinic_id, doctorId]
    );
    if (assocRows.length === 0) {
        const err = new Error("You are not authorized to manage schedule for this clinic");
        err.statusCode = 403;
        throw err;
    }
}

export const updateDoctorScheduleEntry = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { clinic_id, schedule_id } = req.params;
        await assertDoctorAtClinic(doctorId, clinic_id);

        const [rows] = await pool.query(
            `SELECT * FROM doctor_schedules WHERE id = ? AND clinic_id = ? AND doctor_id = ?`,
            [schedule_id, clinic_id, doctorId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Schedule entry not found" });
        }
        const current = rows[0];
        const {
            day_of_week = current.day_of_week,
            is_available = current.is_available,
            start_time = current.start_time,
            end_time = current.end_time,
            break_start = current.break_start,
            break_end = current.break_end,
            slot_duration_minutes = current.slot_duration_minutes,
        } = req.body;

        await pool.query(
            `UPDATE doctor_schedules SET
                day_of_week = ?, is_available = ?, start_time = ?, end_time = ?,
                break_start = ?, break_end = ?, slot_duration_minutes = ?, updated_at = NOW()
             WHERE id = ? AND clinic_id = ? AND doctor_id = ?`,
            [
                day_of_week, is_available, start_time, end_time,
                break_start, break_end, slot_duration_minutes,
                schedule_id, clinic_id, doctorId,
            ]
        );

        return res.status(200).json({ success: true, message: "Doctor schedule entry updated successfully" });
    } catch (err) {
        const status = err.statusCode || 500;
        return res.status(status).json({ success: false, message: err.message });
    }
};

export const deleteDoctorScheduleEntry = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { clinic_id, schedule_id } = req.params;

        await assertDoctorAtClinic(doctorId, clinic_id);

        const [result] = await pool.query(
            `DELETE FROM doctor_schedules WHERE id = ? AND clinic_id = ? AND doctor_id = ?`,
            [schedule_id, clinic_id, doctorId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Schedule entry not found" });
        }

        return res.status(200).json({ success: true, message: "Doctor schedule entry deleted successfully" });
    } catch (err) {
        const status = err.statusCode || 500;
        return res.status(status).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — GET DOCTOR'S SCHEDULE AT A CLINIC
// ─────────────────────────────────────────────────────────────────────────────
export const getDoctorScheduleAtClinic = async (req, res) => {
    try {
        const { doctor_id, clinic_id } = req.params;

        const [schedules] = await pool.query(
            `SELECT * FROM doctor_schedules 
             WHERE doctor_id = ? AND clinic_id = ?
             ORDER BY FIELD(day_of_week, 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')`,
            [doctor_id, clinic_id]
        );

        const [holidays] = await pool.query(
            `SELECT * FROM clinic_holidays 
             WHERE clinic_id = ? AND holiday_date >= CURDATE()
             ORDER BY holiday_date ASC`,
            [clinic_id]
        );

        return res.status(200).json({
            success: true,
            doctor_id: parseInt(doctor_id),
            clinic_id: parseInt(clinic_id),
            schedules,
            upcoming_holidays: holidays
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — GET DOCTOR'S AVAILABLE SLOTS FOR TODAY AND TOMORROW
// ─────────────────────────────────────────────────────────────────────────────
export const getDoctorAvailableSlots = async (req, res) => {
    try {
        const { doctor_id, clinic_id } = req.params;

        // Calculate YYYY-MM-DD for today and tomorrow
        const todayObj = new Date();
        const today = todayObj.getFullYear() + '-' + String(todayObj.getMonth() + 1).padStart(2, '0') + '-' + String(todayObj.getDate()).padStart(2, '0');

        const tomorrowObj = new Date(todayObj);
        tomorrowObj.setDate(tomorrowObj.getDate() + 1);
        const tomorrow = tomorrowObj.getFullYear() + '-' + String(tomorrowObj.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrowObj.getDate()).padStart(2, '0');

        const dates = [
            { label: "today", value: today, dateObj: todayObj },
            { label: "tomorrow", value: tomorrow, dateObj: tomorrowObj }
        ];

        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const result = {};
        let totalSlotsFound = 0;

        for (const d of dates) {
            result[d.label] = {
                date: d.value,
                slots: []
            };

            // 1. Check clinic holidays
            const [holidayRows] = await pool.query(
                `SELECT id FROM clinic_holidays WHERE clinic_id = ? AND holiday_date = ?`,
                [clinic_id, d.value]
            );
            if (holidayRows.length > 0) {
                // Clinic is closed for holiday
                continue;
            }

            // 2. Check clinic schedule
            const dayName = days[d.dateObj.getDay()];
            const [clinicSch] = await pool.query(
                `SELECT * FROM clinic_schedules WHERE clinic_id = ? AND day_of_week = ? AND is_closed = 0`,
                [clinic_id, dayName]
            );
            if (clinicSch.length === 0) {
                // Clinic is closed on this day of week
                continue;
            }
            const cSch = clinicSch[0];

            // 3. Check doctor schedule
            const [docSch] = await pool.query(
                `SELECT * FROM doctor_schedules WHERE doctor_id = ? AND clinic_id = ? AND day_of_week = ? AND is_available = 1`,
                [doctor_id, clinic_id, dayName]
            );
            if (docSch.length === 0) {
                // Doctor has no schedule or is not available
                continue;
            }
            const dSch = docSch[0];

            // Get booked appointments for this doctor on this day
            const [bookedAppts] = await pool.query(
                `SELECT appointment_time FROM appointments 
                 WHERE doctor_id = ? AND appointment_date = ? AND status IN ('pending', 'confirmed', 'rescheduled')`,
                [doctor_id, d.value]
            );

            // Generate slots
            const slotDuration = dSch.slot_duration_minutes || 15;
            let current = new Date(`${d.value}T${dSch.start_time}`);
            const endTime = new Date(`${d.value}T${dSch.end_time}`);

            const now = new Date(); // current time to prevent booking past times today

            while (current < endTime) {
                const slotStart = new Date(current);
                current.setMinutes(current.getMinutes() + slotDuration);
                const slotEnd = new Date(current);

                if (slotEnd > endTime) break;

                const slotTimeString = slotStart.toTimeString().slice(0, 8); // "HH:MM:SS"

                // Check if in the past (for today)
                if (d.label === "today" && slotStart <= now) {
                    continue;
                }

                // Check doctor break
                if (dSch.break_start && dSch.break_end) {
                    const breakStart = new Date(`${d.value}T${dSch.break_start}`);
                    const breakEnd = new Date(`${d.value}T${dSch.break_end}`);
                    if (slotStart >= breakStart && slotStart < breakEnd) {
                        continue;
                    }
                }

                // Check clinic break
                if (cSch.break_start && cSch.break_end) {
                    const clinicBreakStart = new Date(`${d.value}T${cSch.break_start}`);
                    const clinicBreakEnd = new Date(`${d.value}T${cSch.break_end}`);
                    if (slotStart >= clinicBreakStart && slotStart < clinicBreakEnd) {
                        continue;
                    }
                }

                // Check doctor booking conflict (including 10 minute gap)
                let isBooked = false;
                const MIN_GAP_MS = 10 * 60 * 1000;
                for (const appt of bookedAppts) {
                    const apptTime = new Date(`${d.value}T${appt.appointment_time}`);
                    if (Math.abs(slotStart - apptTime) < MIN_GAP_MS) {
                        isBooked = true;
                        break;
                    }
                }

                if (!isBooked) {
                    result[d.label].slots.push(slotTimeString);
                    totalSlotsFound++;
                }
            }
        }

        if (totalSlotsFound === 0) {
            return res.status(200).json({
                success: false,
                message: "slots are full for today and tomorrow please check for appointment tomorrow or after few moment",
                data: result
            });
        }

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
