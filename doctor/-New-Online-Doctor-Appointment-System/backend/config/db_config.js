import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

export const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise()

export const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("MySQL connected successfully");
    connection.release();
  } catch (err) {
    console.error("MySQL connection failed:", err.message);
  }
};

// export async function getNote(id) {
//     const [row] = await pool.query(
//         `SELECT * FROM note WHERE id= ?`, [id]
//     );
//     return row[0];
// }

// export async function getNotes() {
//     const [rows] = await pool.query("Select * from note");
//     return rows;
// }

// export async function createNote (title, contents) {
//     const [result] = await pool.query(
//         `INSERT INTO note (title, contents) VALUES (?, ?)`, [title, contents]
//     );
//     const id = result.insertId;
//     return getNote(id);
// }

// const notes = await getNotes();
// console.log(notes);
// const note = await getNote(10);
// console.log('Note: ',note);
// const note = await createNote('Creating a note 3', 'A note about creating something 3');
// console.log(note);