import { pool } from "../config/db_config.js";

export const getDoctors = async (req, res) => {
    try {
        const { category_id, search } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const offset = (page > 0 ? page - 1 : 0) * limit;

        let doctorsQuery = `
            SELECT id, first_name, last_name, gender, dob_bs, dob_ad, province, 
                   district, city, ward, tole, email, phone_number, profile_image, 
                   role, category_id, is_active, email_verified, created_at
            FROM users WHERE role = 'doctor'
        `;
        
        let countQuery = `SELECT COUNT(*) as total FROM users WHERE role = 'doctor'`;
        let queryParams = [];

        // 1. Filter by category_id
        if (category_id) {
            doctorsQuery += ` AND category_id = ?`;
            countQuery += ` AND category_id = ?`;
            queryParams.push(category_id);
        }

        // 2. Search by Full Name or Email
        if (search) {
            const searchTerm = `%${search}%`;
            // This combines first and last name with a space to allow full-name matching
            const searchSQL = ` AND (CONCAT(first_name, ' ', last_name) LIKE ? OR email LIKE ?)`;
            
            doctorsQuery += searchSQL;
            countQuery += searchSQL;
            
            queryParams.push(searchTerm, searchTerm);
        }

        // 3. Add Pagination
        const doctorsParams = [...queryParams, limit, offset];
        doctorsQuery += ` LIMIT ? OFFSET ?`;

        const [[{ total }]] = await pool.query(countQuery, queryParams);
        const [doctors] = await pool.query(doctorsQuery, doctorsParams);

        const total_data = total || 0;
        const total_pages = total_data > 0 ? Math.ceil(total_data / limit) : 0;
        const current_page = total_data > 0 ? page : 0;
        const has_next_page = page < total_pages;

        return res.status(200).json({
            success: true,
            total_data,
            total_pages,
            current_page,
            has_next_page,
            count: doctors.length,
            doctors: doctors
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
