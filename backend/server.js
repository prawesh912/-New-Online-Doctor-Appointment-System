import express from "express";
import dotenv from 'dotenv';
import cors from 'cors';
// import  from "./config/db_config.js";
import { connectDB } from "./config/db_config.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.urlencoded({extended: false}));
app.use(cors({origin: "*"}));
app.use(express.json());

app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(500).send('Something broke!');
})

import test from './routes/test_routes.js';
import patients from './routes/patients_routes.js';
import auth from './routes/auth_routes.js';

app.use('/api/v1/test', test);
app.use('/api/v1/patients', patients);
app.use('/api/v1/auth', auth);

await connectDB();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});