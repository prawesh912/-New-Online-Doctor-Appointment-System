import { pool } from "../config/db_config.js";
import { getPaginationParams, paginatedResponse, getDateRange } from "../utils/pagination.js";

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

async function assertClinicOwner(clinic_id, doctorId) {
    const [clinicRows] = await pool.query(`SELECT doctor_id FROM clinics WHERE id = ?`, [clinic_id]);
    if (clinicRows.length === 0) {
        const err = new Error("Clinic not found");
        err.statusCode = 404;
        throw err;
    }
    if (clinicRows[0].doctor_id !== doctorId) {
        const err = new Error("Not authorized");
        err.statusCode = 403;
        throw err;
    }
}

export const updateClinicScheduleEntry = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { clinic_id, schedule_id } = req.params;
        await assertClinicOwner(clinic_id, doctorId);

        const [rows] = await pool.query(
            `SELECT * FROM clinic_schedules WHERE id = ? AND clinic_id = ?`,
            [schedule_id, clinic_id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Schedule entry not found" });
        }
        const current = rows[0];
        const {
            day_of_week = current.day_of_week,
            is_closed = current.is_closed,
            open_time = current.open_time,
            close_time = current.close_time,
            break_start = current.break_start,
            break_end = current.break_end,
        } = req.body;

        await pool.query(
            `UPDATE clinic_schedules SET
                day_of_week = ?, is_closed = ?, open_time = ?, close_time = ?, break_start = ?, break_end = ?
             WHERE id = ? AND clinic_id = ?`,
            [day_of_week, is_closed, open_time, close_time, break_start, break_end, schedule_id, clinic_id]
        );

        return res.status(200).json({ success: true, message: "Clinic schedule updated successfully" });
    } catch (err) {
        const status = err.statusCode || 500;
        return res.status(status).json({ success: false, message: err.message });
    }
};

export const deleteClinicScheduleEntry = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { clinic_id, schedule_id } = req.params;

        await assertClinicOwner(clinic_id, doctorId);

        const [result] = await pool.query(
            `DELETE FROM clinic_schedules WHERE id = ? AND clinic_id = ?`,
            [schedule_id, clinic_id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Schedule entry not found" });
        }

        return res.status(200).json({ success: true, message: "Clinic schedule deleted successfully" });
    } catch (err) {
        const status = err.statusCode || 500;
        return res.status(status).json({ success: false, message: err.message });
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

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR — VIEW RECEPTIONIST JOB APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────
export const getReceptionistApplications = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { start_date, end_date } = getDateRange(req.query);
        const status = req.query.status;
        const { clinic_id, search } = req.query;
        const { limit, page, offset } = getPaginationParams(req.query);

        let baseWhere = `WHERE c.doctor_id = ?`;
        const params = [doctorId];

        if (status) {
            baseWhere += ` AND cs.status = ?`;
            params.push(status);
        }
        if (clinic_id) {
            baseWhere += ` AND cs.clinic_id = ?`;
            params.push(clinic_id);
        }
        baseWhere += ` AND DATE(COALESCE(cs.applied_at, cs.hired_at)) >= ? AND DATE(COALESCE(cs.applied_at, cs.hired_at)) <= ?`;
        params.push(start_date, end_date);

        if (search) {
            baseWhere += ` AND (CONCAT(u.first_name, ' ', u.last_name) LIKE ? OR u.email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM clinic_staff cs
             JOIN clinics c ON cs.clinic_id = c.id
             JOIN users u ON cs.user_id = u.id
             ${baseWhere}`,
            params
        );

        const [applications] = await pool.query(
            `SELECT cs.id AS application_id, cs.status, cs.reason, cs.hired_at, cs.applied_at,
                    c.id AS clinic_id, c.name AS clinic_name,
                    u.id AS user_id, u.first_name, u.last_name, u.email, u.phone_number
             FROM clinic_staff cs
             JOIN clinics c ON cs.clinic_id = c.id
             JOIN users u ON cs.user_id = u.id
             ${baseWhere}
             ORDER BY COALESCE(cs.applied_at, cs.hired_at) DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return res.status(200).json(
            paginatedResponse({
                total,
                page,
                limit,
                items: applications,
                key: "applications",
                extra: { date_from: start_date, date_to: end_date },
            })
        );
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// RECEPTIONIST — VIEW OWN CLINIC APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────
export const getMyReceptionistApplications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { start_date, end_date } = getDateRange(req.query);
        const status = req.query.status;
        const { search } = req.query;
        const { limit, page, offset } = getPaginationParams(req.query);

        let baseWhere = `WHERE cs.user_id = ?`;
        const params = [userId];

        if (status) {
            baseWhere += ` AND cs.status = ?`;
            params.push(status);
        }
        baseWhere += ` AND DATE(COALESCE(cs.applied_at, cs.hired_at)) >= ? AND DATE(COALESCE(cs.applied_at, cs.hired_at)) <= ?`;
        params.push(start_date, end_date);

        if (search) {
            baseWhere += ` AND c.name LIKE ?`;
            params.push(`%${search}%`);
        }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM clinic_staff cs
             JOIN clinics c ON cs.clinic_id = c.id
             ${baseWhere}`,
            params
        );

        const [applications] = await pool.query(
            `SELECT cs.id AS application_id, cs.status, cs.reason, cs.hired_at, cs.applied_at,
                    c.id AS clinic_id, c.name AS clinic_name, c.city, c.district
             FROM clinic_staff cs
             JOIN clinics c ON cs.clinic_id = c.id
             ${baseWhere}
             ORDER BY COALESCE(cs.applied_at, cs.hired_at) DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return res.status(200).json(
            paginatedResponse({
                total,
                page,
                limit,
                items: applications,
                key: "applications",
                extra: { date_from: start_date, date_to: end_date },
            })
        );
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR (CLINIC OWNER) — ADD A VERIFIED ASSOCIATE DOCTOR TO CLINIC
// ─────────────────────────────────────────────────────────────────────────────
export const addDoctorToClinic = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { clinic_id, associate_doctor_id } = req.body;

        if (!clinic_id || !associate_doctor_id) {
            return res.status(400).json({ success: false, message: "clinic_id and associate_doctor_id are required" });
        }

        // Verify clinic ownership
        const [clinicRows] = await pool.query(
            `SELECT doctor_id FROM clinics WHERE id = ?`,
            [clinic_id]
        );
        if (clinicRows.length === 0) {
            return res.status(404).json({ success: false, message: "Clinic not found" });
        }
        if (clinicRows[0].doctor_id !== doctorId) {
            return res.status(403).json({ success: false, message: "You are not the owner of this clinic" });
        }

        // Verify associate doctor role and verification status
        const [doctorRows] = await pool.query(
            `SELECT u.id, dk.status 
             FROM users u
             LEFT JOIN doctor_kyc dk ON dk.user_id = u.id
             WHERE u.id = ? AND u.role = 'doctor'`,
            [associate_doctor_id]
        );
        if (doctorRows.length === 0) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }
        if (doctorRows[0].status !== "verified") {
            return res.status(400).json({ success: false, message: "Doctor KYC is not verified" });
        }

        // Insert into clinic_doctors
        await pool.query(
            `INSERT INTO clinic_doctors (clinic_id, doctor_id, is_active)
             VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE is_active = 1`,
            [clinic_id, associate_doctor_id]
        );

        return res.status(200).json({ success: true, message: "Doctor added to clinic successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR (CLINIC OWNER) — GET ALL DOCTORS AT CLINIC
// ─────────────────────────────────────────────────────────────────────────────
export const getDoctorsAtClinic = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { clinic_id } = req.params;

        // Verify clinic ownership
        const [clinicRows] = await pool.query(
            `SELECT doctor_id FROM clinics WHERE id = ?`,
            [clinic_id]
        );
        if (clinicRows.length === 0) {
            return res.status(404).json({ success: false, message: "Clinic not found" });
        }
        if (clinicRows[0].doctor_id !== doctorId) {
            return res.status(403).json({ success: false, message: "You are not the owner of this clinic" });
        }

        const ownerDoctorId = clinicRows[0].doctor_id;

        // Get associates
        const [assocRows] = await pool.query(
            `SELECT doctor_id FROM clinic_doctors WHERE clinic_id = ? AND is_active = 1`,
            [clinic_id]
        );

        const doctorIds = [...new Set([ownerDoctorId, ...assocRows.map(r => r.doctor_id)])];
        if (doctorIds.length === 0) {
            return res.status(200).json({ success: true, count: 0, doctors: [] });
        }

        const [doctors] = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.phone_number, u.profile_image, u.gender,
                    dk.years_experience, dk.nmc_registration_number,
                    cat.name AS specialization,
                    IF(u.id = ?, 'owner', 'associate') AS doctor_role
             FROM users u
             LEFT JOIN doctor_kyc dk ON dk.user_id = u.id
             LEFT JOIN categories cat ON cat.id = dk.category_id
             WHERE u.id IN (?) AND u.role = 'doctor'`,
            [ownerDoctorId, doctorIds]
        );

        return res.status(200).json({ success: true, count: doctors.length, doctors });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR (CLINIC OWNER) — SET OR UPDATE CLINIC PRICING
// ─────────────────────────────────────────────────────────────────────────────
export const upsertClinicPricing = async (req, res) => {
    try {
        const doctorId = req.user.userId;
        const { clinic_id } = req.params;
        const { price } = req.body;

        if (price === undefined || price === null) {
            return res.status(400).json({ success: false, message: "price is required" });
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum < 0) {
            return res.status(400).json({ success: false, message: "price must be a non-negative number" });
        }

        const [clinicRows] = await pool.query(
            `SELECT doctor_id FROM clinics WHERE id = ?`,
            [clinic_id]
        );
        if (clinicRows.length === 0) {
            return res.status(404).json({ success: false, message: "Clinic not found" });
        }
        if (clinicRows[0].doctor_id !== doctorId) {
            return res.status(403).json({ success: false, message: "You are not the owner of this clinic" });
        }

        await pool.query(
            `INSERT INTO pricing (clinic_id, price)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE price = VALUES(price)`,
            [clinic_id, priceNum]
        );

        return res.status(200).json({
            success: true,
            message: "Clinic pricing saved successfully",
            clinic_id: parseInt(clinic_id),
            price: priceNum
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};