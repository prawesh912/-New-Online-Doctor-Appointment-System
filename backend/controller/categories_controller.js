import { pool } from '../config/db_config.js';

export const createCategory = async (req, res) => {
    try{
        const {name, description, icon, is_active} = req.body;
        if(!name) return res.status(400).json({success: false, message: "Category name is required"});

        const [result] = await pool.query(`
            INSERT INTO categories (name, description, icon, is_active)
            VALUES (?,?,?,?)
            `, [name, description, icon, is_active]);

            return res.status(201).json({
                success: true,
                message: "Category created successfully",
                category_id: result.insertId
            })
    }catch (err){
         return res.status(500).json({
            success: false,
            message: err.message
        });
    }
}

export const getAllCategories = async (req, res) => {
    try{
        const [categories] = await pool.query(
            `SELECT * FROM categories`
        );

        if(categories.length == 0) return res.status(200).json({success: false, message: "Categories not found", categories: categories});

        return res.status(200).json({success: true, message: "Categories Found", categories: categories})
    } catch (err){
        return res.status(500).json({success: false, message: err.message});
    }
}

export const getCategoryById = async (req, res) => {
    try{
        const { id } = req.params;

         if (!id) {
            return res.status(400).json({
                success: false,
                message: "Category ID is required"
            });
        }

        const [category] = await pool.query(
            `SELECT * FROM categories WHERE id = ?`, [id]
        );

        if(category.length == 0) return res.status(404).json({success: false, message: "Category Id not found", category: category[0]});

        return res.status(200).json({success: true, message: "Categories Found", category: category[0]})
    } catch (err){
        return res.status(500).json({success: false, message: err.message});
    }
}

export const deleteCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Valid category ID is required"
            });
        }

        const [existingUser] = await pool.query(
            "SELECT id FROM categories WHERE id = ?",
            [id]
        );

        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        const [result] = await pool.query(
            "DELETE FROM categories WHERE id = ?",
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Category Id deleted successfully",
            affectedRows: result.affectedRows
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};