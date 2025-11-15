import mongoose from "mongoose";
import { compareHash } from "../security/bcrypter";

const AdminSchema = new mongoose.Schema(
    { 
        username: {
            type: String,
            required: true,
            unique: true,
            select:false
        },
        password: {
            type: String,
            required: true,
            select: false
        },
        publicUsername: {
            type: String,
            required: true           
        }
    }
);

AdminSchema.methods.comparePass = async function(possiblePass) {
    return await compareHash(possiblePass, this.password);
}

const Admin = mongoose.model('Admin', AdminSchema); 
export default Admin;
