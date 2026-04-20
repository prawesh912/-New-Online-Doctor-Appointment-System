import { pool } from "../config/db_config.js";

export const createClinic = async (req, res) => {
    try {
        const doctorId = req.user.userId;

        const {
            name,
            description,
            province,
            district,
            city,
            ward,
            tole,
            address,
            primary_phone_number,
            secondary_phone_number,
            email
        } = req.body;

        if (!name || !province || !district || !city || !ward || !email) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing"
            });
        }

        const [result] = await pool.query(
            `INSERT INTO clinics 
            (doctor_id, name, description, province, district, city, ward, tole, address, primary_phone_number, secondary_phone_number, email)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                doctorId,
                name,
                description || null,
                province,
                district,
                city,
                ward,
                tole || null,
                address || null,
                primary_phone_number || null,
                secondary_phone_number || null,
                email
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Clinic created successfully",
            clinic_id: result.insertId
        });

    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
                success: false,
                message: "Clinic email already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const applyToClinic = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { clinic_id } = req.body;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                message: "clinic_id is required"
            });
        }

        // check receptionist KYC verified
        const [kyc] = await pool.query(
            `SELECT status FROM receptionist_kyc WHERE user_id = ?`,
            [userId]
        );

        if (kyc.length === 0 || kyc[0].status !== "verified") {
            return res.status(403).json({
                success: false,
                message: "Complete and verify KYC first"
            });
        }

        await pool.query(
            `INSERT INTO clinic_staff (clinic_id, user_id)
             VALUES (?, ?)`,
            [clinic_id, userId]
        );

        return res.status(201).json({
            success: true,
            message: "Applied to clinic successfully"
        });

    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
                success: false,
                message: "Already applied"
            });
        }

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const updateStaffStatus = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { staff_id } = req.params;
        const { status } = req.body;

        if (!["active", "rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });
        }

        // ensure clinic belongs to doctor
        const [staff] = await pool.query(
            `SELECT cs.*, c.doctor_id
             FROM clinic_staff cs
             JOIN clinics c ON cs.clinic_id = c.id
             WHERE cs.id = ?`,
            [staff_id]
        );

        if (staff.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Staff not found"
            });
        }

        if (staff[0].doctor_id !== doctorId) {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        await pool.query(
            `UPDATE clinic_staff 
             SET status = ?, hired_at = NOW()
             WHERE id = ?`,
            [status, staff_id]
        );

        return res.status(200).json({
            success: true,
            message: `Staff ${status} successfully`
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getMyClinics = async (req, res) => {
    try {
        const doctorId = req.user.userId;

        const [clinics] = await pool.query(
            `SELECT * FROM clinics WHERE doctor_id = ?`,
            [doctorId]
        );

        return res.status(200).json({
            success: true,
            count: clinics.length,
            clinics
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getClinicStaff = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { clinic_id } = req.params;

        const [staff] = await pool.query(
            `SELECT cs.id, cs.status, u.id as user_id, u.first_name, u.last_name, u.email
             FROM clinic_staff cs
             JOIN users u ON cs.user_id = u.id
             JOIN clinics c ON cs.clinic_id = c.id
             WHERE cs.clinic_id = ? AND c.doctor_id = ?`,
            [clinic_id, doctorId]
        );

        return res.status(200).json({
            success: true,
            count: staff.length,
            staff
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getClinicById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT * FROM clinics WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Clinic not found"
            });
        }

        return res.status(200).json({
            success: true,
            clinic: rows[0]
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const updateClinic = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { id } = req.params;

        const [rows] = await pool.query(
            `SELECT * FROM clinics WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Clinic not found"
            });
        }

        const clinic = rows[0];

        if (clinic.doctor_id !== doctorId) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this clinic"
            });
        }

        const {
            name,
            description,
            province,
            district,
            city,
            ward,
            tole,
            address,
            primary_phone_number,
            secondary_phone_number,
            email,
            is_active
        } = req.body;

        await pool.query(
            `UPDATE clinics SET
                name = ?,
                description = ?,
                province = ?,
                district = ?,
                city = ?,
                ward = ?,
                tole = ?,
                address = ?,
                primary_phone_number = ?,
                secondary_phone_number = ?,
                email = ?,
                is_active = ?
             WHERE id = ?`,
            [
                name ?? clinic.name,
                description ?? clinic.description,
                province ?? clinic.province,
                district ?? clinic.district,
                city ?? clinic.city,
                ward ?? clinic.ward,
                tole ?? clinic.tole,
                address ?? clinic.address,
                primary_phone_number ?? clinic.primary_phone_number,
                secondary_phone_number ?? clinic.secondary_phone_number,
                email ?? clinic.email,
                is_active ?? clinic.is_active,
                id
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Clinic updated successfully"
        });

    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const upsertClinicSchedule = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { clinic_id } = req.params;
        const schedules = req.body.schedules; // array

        if (!Array.isArray(schedules) || schedules.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Schedules array is required"
            });
        }

        // check ownership
        const [clinicRows] = await pool.query(
            `SELECT doctor_id FROM clinics WHERE id = ?`,
            [clinic_id]
        );

        if (clinicRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Clinic not found"
            });
        }

        if (clinicRows[0].doctor_id !== doctorId) {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        for (const s of schedules) {
            const {
                day_of_week,
                is_closed,
                open_time,
                close_time,
                break_start,
                break_end
            } = s;

            await pool.query(
                `INSERT INTO clinic_schedules 
                (clinic_id, day_of_week, is_closed, open_time, close_time, break_start, break_end)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    is_closed = VALUES(is_closed),
                    open_time = VALUES(open_time),
                    close_time = VALUES(close_time),
                    break_start = VALUES(break_start),
                    break_end = VALUES(break_end)
                `,
                [
                    clinic_id,
                    day_of_week,
                    is_closed ?? false,
                    open_time || null,
                    close_time || null,
                    break_start || null,
                    break_end || null
                ]
            );
        }

        return res.status(200).json({
            success: true,
            message: "Schedule updated successfully"
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const getClinicWithSchedule = async (req, res) => {
    try {
        const { id } = req.params;

        const [clinic] = await pool.query(
            `SELECT * FROM clinics WHERE id = ?`,
            [id]
        );

        if (clinic.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Clinic not found"
            });
        }

        const [schedule] = await pool.query(
            `SELECT * FROM clinic_schedules WHERE clinic_id = ?`,
            [id]
        );

        return res.status(200).json({
            success: true,
            clinic: clinic[0],
            schedule
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

export const isClinicOpenNow = async (clinic_id) => {
    const today = new Date().toLocaleString("en-US", { weekday: "long" }).toLowerCase();
    const now = new Date().toTimeString().slice(0, 8);

    const [rows] = await pool.query(
        `SELECT * FROM clinic_schedules 
         WHERE clinic_id = ? AND day_of_week = ?`,
        [clinic_id, today]
    );

    if (rows.length === 0) return false;

    const s = rows[0];

    if (s.is_closed) return false;

    if (now < s.open_time || now > s.close_time) return false;

    if (s.break_start && now >= s.break_start && now <= s.break_end) return false;

    return true;
};