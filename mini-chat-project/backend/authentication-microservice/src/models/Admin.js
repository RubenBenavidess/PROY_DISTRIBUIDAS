import mongoose from "mongoose";
import { compareHash } from "../config/bcrypter";

const AdminSchema = new mongoose.Schema(
    { 
        username: {
            type: String,
            required: true,
            unique: true 
        },
        password: {
            type: String,
            required: true,
            select: false
        }
    },
    {
        methods: {
            async comparePass(possiblePass){
                return await compareHash(possiblePass, this.password);
            }
        }
    }
);

const Admin = mongoose.model('Admin', AdminSchema); 
export default Admin;
