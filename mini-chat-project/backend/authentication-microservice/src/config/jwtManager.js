import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export function generateToken(payload){
    
    const SECRET_KEY = process.env.JWT_SECRET_KEY;
    const TOKEN = jwt.sign(payload, SECRET_KEY, {
        expiresIn: "1h",
        algorithm: "ES256"
    });

    return TOKEN;

}

export function validateToken(token){
    
}