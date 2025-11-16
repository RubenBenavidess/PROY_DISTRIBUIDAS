import { login as loginService}  from "../services/authService.js";
import { adminLoginSchema } from "../security/zSchemes.js";

export async function login(req, res, next){
    try{
        const admin = adminLoginSchema.parse(req.body);
        const data = await loginService(admin);
        return res.status(200).json(data);
    }catch(e){
        return next(e);
    } 
}