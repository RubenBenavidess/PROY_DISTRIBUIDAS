import { login as loginService}  from "../services/authService.js";
import { adminLoginSchema } from "../security/zSchemes.js";
import { validateToken } from "../security/jwtManager.js";

export async function login(req, res, next){
    try{
        const admin = adminLoginSchema.parse(req.body);
        const token = await loginService(admin);
        res.cookie("accessToken", token, {
            httpOnly: true,
            secure: false,               // JUST FOR DEV, CHANGE IT TO TRUE IN PROD !!
            sameSite: "Lax",
            maxAge: 3600000
        });
        return res.status(200).json({
            success: true,
            message: "Authenticated. Token Sent"
        });
    }catch(e){
        return next(e);
    } 
}

export async function verifySession(req, res, next){
    try{
        const token = req.cookies.accessToken;
        
        if(!token){
            return res.status(401).json({
                success: false,
                message: "No session found"
            });
        }

        // Validate token
        const decoded = validateToken(token);
        
        return res.status(200).json({
            success: true,
            user: decoded
        });
    }catch(e){
        return res.status(401).json({
            success: false,
            message: "Invalid session"
        });
    }
}

export async function logout(req, res, next){
    try{
        // Clear the cookie
        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: false,
            sameSite: "Lax"
        });
        
        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    }catch(e){
        return next(e);
    }
}