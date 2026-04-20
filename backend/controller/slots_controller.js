import { pool } from "../config/db_config";

export const generateSlots = async (req, res) => {
    try {
        const { doctor_id, clinic_id, date, start_time, end_time, slot_duration } = req.body;

        const slots = [];

        let current = new Date(`1970-01-01T${start_time}`);
        const end = new Date(`1970-01-01T${end_time}`);

        while (current < end) {
            const slotStart = new Date(current);
            current.setMinutes(current.getMinutes() + slot_duration);
            const slotEnd = new Date(current);

            if (slotEnd <= end) {
                slots.push([
                    doctor_id,
                    clinic_id,
                    date,
                    slotStart.toTimeString().slice(0, 5),
                    slotEnd.toTimeString().slice(0, 5),
                    'available'
                ]);
            }
        }

        await pool.query(
            `INSERT INTO generated_slots 
            (doctor_id, clinic_id, slot_date, start_time, end_time, status)
            VALUES ?`,
            [slots]
        );

        res.json({
            success: true,
            message: "Slots generated successfully",
            total: slots.length
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getAvailableSlots = async (req, res) => {
    try {
        const { doctor_id, date } = req.query;

        const [slots] = await pool.query(
            `SELECT * FROM generated_slots
             WHERE doctor_id = ? AND slot_date = ? AND status = 'available'`,
            [doctor_id, date]
        );

        res.json({
            success: true,
            slots
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const bookSlot = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { slot_id, patient_id, clinic_id } = req.body;

        // lock slot
        const [slots] = await connection.query(
            `SELECT * FROM generated_slots WHERE id = ? FOR UPDATE`,
            [slot_id]
        );

        if (!slots.length || slots[0].status !== "available") {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Slot not available"
            });
        }

        const slot = slots[0];

        // create appointment
        const [result] = await connection.query(
            `INSERT INTO appointments
            (patient_id, doctor_id, clinic_id, slot_id, status)
            VALUES (?, ?, ?, ?, 'pending')`,
            [patient_id, slot.doctor_id, clinic_id, slot_id]
        );

        // update slot
        await connection.query(
            `UPDATE generated_slots SET status = 'booked', appointment_id = ? WHERE id = ?`,
            [result.insertId, slot_id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: "Appointment booked"
        });

    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};