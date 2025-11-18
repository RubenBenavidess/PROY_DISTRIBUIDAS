import dotenv from 'dotenv';
dotenv.config();

import connect from './config/db.js';
import express from 'express';
import cors from 'cors';
import logsRouter from './routes/logsRouter.js';

// Minimal error handler (don't depend on auth-microservice import)
const handleErrors = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message });
};

// Connect DB
connect();

const app = express();

const CORS_OPTIONS = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl, server-to-server)
    if (!origin) return callback(null, true);
    const allowed = ['http://localhost:3000', 'http://localhost:3002'];
    if (allowed.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
};

app.use(cors(CORS_OPTIONS));
app.use(express.json());
app.use('/logs', logsRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Not Found: ${req.method} ${req.originalUrl}` });
});

// Error middleware
app.use(handleErrors);

const PORT = process.env.L_PORT || 4001;
app.listen(PORT, () => {
  console.log(`Logs microservice running on port ${PORT}`);
});
