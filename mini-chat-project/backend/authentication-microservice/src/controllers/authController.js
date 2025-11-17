import { login as loginService}  from "../services/authService.js";
import { adminLoginSchema } from "../security/zSchemes.js";

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