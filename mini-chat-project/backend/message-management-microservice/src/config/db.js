import mongoose from "mongoose";

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME;

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];
requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
    }
});

const MONGODB_URI = `mongodb+srv://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`;

export default async function connect() {
    try {
        await mongoose.connect(MONGODB_URI, {
          serverSelectionTimeoutMS: 30000,  // 30 segundos para conectar
          socketTimeoutMS: 45000,            // 45 segundos para operaciones
          connectTimeoutMS: 30000,           // 30 segundos para timeout inicial
          retryWrites: true,
          maxPoolSize: 10
        }); 
        console.log("Conexión exitosa a MongoDB");
    } catch (error) {
        console.error("Error al conectar a MongoDB:", error);
        throw error;
    }
}