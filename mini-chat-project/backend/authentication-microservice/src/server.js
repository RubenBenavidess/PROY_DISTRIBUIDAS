import dotenv from "dotenv";
dotenv.config();

import connect from "./config/db.js";

import express from "express";
import router from "./routes/authRouter.js";
import helmet from "helmet";
import cors from "cors";
import handleErrors from "./middleware/errors/errorMIddleware.js";

// Initialization/Connection to DB
connect();
const app = express();

// Config APP

//  security middleware
app.use(helmet());

const CORS_OPTIONS = {
    origin: '*',
    optionsSuccessStatus: 200
}
app.use(cors(CORS_OPTIONS));

//  basic middleware
app.use(express.json());
app.use(router);

// Error middleware

app.use(handleErrors);


// Other endpoints
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Not Found: ${req.method} ${req.originalUrl}`
    });
});

// Init App
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log('Auth Microservice running!');
});