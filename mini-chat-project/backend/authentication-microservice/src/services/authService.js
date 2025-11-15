import Admin from "../models/Admin";
import { generateToken } from "../security/jwtManager";

export async function login(admin){

    const foundAdmin = await Admin.findOne( {username: admin.username} ).select("+password").exec();
    
    if(!foundAdmin)
        throw new Error("Invalid Credentials");

    const valid_pass = await foundAdmin.comparePass(admin.password);

    if(!valid_pass)
        throw new Error("Invalid Credentials");

    // Correct Workflow

    const payload = {
        admin_id: foundAdmin.id,        
        username: foundAdmin.publicUsername
    }
    const token = generateToken(payload);
    return {
        success: true,
        token: token
    };

}

