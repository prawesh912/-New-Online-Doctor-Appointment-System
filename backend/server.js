import express from "express";
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from "./config/db_config.js";
import status from 'express-status-monitor';
dotenv.config();

const app = express();
app.use(status());
const PORT = process.env.PORT;

app.use(express.urlencoded({extended: false}));
app.use(cors({origin: "*"}));
app.use(express.json());

app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(500).send('Something broke!');
})

import test from './routes/test_routes.js';
import users from './routes/users_routes.js';
import auth from './routes/auth_routes.js';
import category from './routes/categories_routes.js';

app.use('/api/v1/test', test);
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', users);
app.use('/api/v1/category', category);
// app.use(verifyJWT);

await connectDB();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});