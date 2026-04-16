import cluster from 'cluster';
import os from 'os';
import express from "express";
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import status from 'express-status-monitor';
import MySQLStore from "express-mysql2-session";
import passport from 'passport';
import { pool, connectDB } from "./config/db_config.js";
import './auth/google.js';

import test from './routes/test_routes.js';
import users from './routes/users_routes.js';
import auth from './routes/auth_routes.js';
import category from './routes/categories_routes.js';

dotenv.config();

const totalCpus = os.availableParallelism();
const PORT = process.env.PORT;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  for (let i = 0; i < totalCpus; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

} else {
  // Worker process
  const app = express();

  //* Session START *//

  // initialize MySQLStore
  const MySQLSessionStore = MySQLStore(session);

  // Create session store using existing pool

  const sessionStore = new MySQLSessionStore({
    clearExpired: true,
    checkExpirationInterval: 1000 * 60 * 15,
    expiration: 1000* 60 * 60 * 24,
    createDatabaseTable: true,
    schema: {
      tableName: "sessions",
      columnNames: {
        session_id: "session_id",
        expires: "expires",
        data: "data",
      }
    },
  }, pool);

  app.use(session({
    key: "session_cookie_name",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { maxAge: 1000 * 60 * 60 * 24}
  }))

  app.use(passport.initialize())
  app.use(passport.session())

  app.get('/api/v1/home', (req, res) => {
    if(req.session.username){
      res.send(`<h1>Home Username from session is: ${req.session.username}, ${req.session.email} </h1>`)
    }else{
      res.send('<h1>Home No username found in session.</h1>')
    }
  })
  app.get('/api/v1/set', (req, res) => {
    req.session.username = "Shuvam"
    req.session.email = "shuvam@gmail.com"
    res.send('<h1>Username has been set in session.</h1>')
  })

  app.get('/api/v1/get', (req, res) => {
    if(req.session.username){
      res.send(`<h1>Username from session is: ${req.session.username}, ${req.session.email} </h1>`)
    }else{
      res.send('<h1>No username found in session.</h1>')
    }
  })

  app.get('/api/v1/destroy', (req, res) => {
    req.session.destroy((err) => {
      if(err){
        res.status(500).send('Failed to destroy session.');
      }else{
        res.send('Session destroyed successfully');
      }
    });
  })
  
  //* Session END *//


  app.use(status());
  app.use(express.urlencoded({ extended: false }));
  app.use(cors({ origin: "*" }));
  app.use(express.json());

  app.use('/api/v1/test', test);
  app.use('/api/v1/auth', auth);
  app.use('/api/v1/users', users);
  app.use('/api/v1/category', category);

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });

  await connectDB();

  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} running on port ${PORT}`);
  });
}

// node
// require('crypto').randomBytes(64).toString('hex')