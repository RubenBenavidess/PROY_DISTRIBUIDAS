import Admin from "../models/Admin";
import { generateToken } from "../config/jwtManager";
import { generateHash } from "../config/bcrypter";

async function login(admin){

    const foundAdmin = await Admin.findOne( {username: admin.username} ).select("+password");
    
    if(!foundAdmin)
        throw new Error("Credenciales Inválidas");

    const VALID_PASS = await foundAdmin.methods.comparePass(admin.password);

    if(!VALID_PASS)
        throw new Error("Credenciales Inválidas");

    // Correct Workflow

    // const hashed_username = generateHash();

    const payload = {
        admin_id: foundAdmin.id,
        username: foundAdmin.username
    }
    const token = generateToken(PAYLOAD);
    return {
        success: true,
        token: token
    };

}

