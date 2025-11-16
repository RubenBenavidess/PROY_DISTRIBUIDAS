import Admin from "../models/Admin.js";
import { generateToken } from "../security/jwtManager.js";

export async function login(admin){

    const foundAdmin = await Admin.findOne( {username: admin.username} ).select("+password").exec();
    
    if(!foundAdmin)
        throw new Error("Invalid Credentials A");

    const valid_pass = await foundAdmin.comparePass(admin.password);

    if(!valid_pass)
        throw new Error("Invalid Credentials B");

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

