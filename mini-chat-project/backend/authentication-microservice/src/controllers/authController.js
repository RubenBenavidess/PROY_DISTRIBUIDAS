import { login }  from "../services/authService";
import { adminLoginSchema } from "../security/zSchemes";

export async function login(req, res, next){
    try{
        const admin = adminLoginSchema.parse(req.body);
        const data = await login(admin);
        return res.status(200).json(data);
    }catch(e){
        return next(e);
    } 
}