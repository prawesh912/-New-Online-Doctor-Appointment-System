import { pool } from "../config/db_config.js";

export const getPatients = async (req, res) => {
    try {
        const { category_id, search } = req.query; // Added search to destructuring
        
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const offset = (page > 0 ? page - 1 : 0) * limit;

        let patientsQuery = `
            SELECT id, first_name, last_name, gender, dob_bs, dob_ad, province, 
                   district, city, ward, tole, email, phone_number, profile_image, 
                   role, category_id, is_active, email_verified, created_at
            FROM users WHERE role = 'patient'
        `;
        
        let countQuery = `SELECT COUNT(*) as total FROM users WHERE role = 'patient'`;
        let queryParams = [];

        // 1. Filter by category if provided
        if (category_id) {
            patientsQuery += ` AND category_id = ?`;
            countQuery += ` AND category_id = ?`;
            queryParams.push(category_id);
        }

        // 2. Search by Full Name or Email
        if (search) {
            const searchTerm = `%${search}%`;
            // Combined first/last name check to allow searching full names
            const searchSQL = ` AND (CONCAT(first_name, ' ', last_name) LIKE ? OR email LIKE ?)`;
            
            patientsQuery += searchSQL;
            countQuery += searchSQL;
            
            queryParams.push(searchTerm, searchTerm);
        }

        // 3. Add Pagination
        const patientsParams = [...queryParams, limit, offset];
        patientsQuery += ` LIMIT ? OFFSET ?`;

        const [[{ total }]] = await pool.query(countQuery, queryParams);
        const [patients] = await pool.query(patientsQuery, patientsParams);

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
            count: patients.length,
            patients: patients
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

