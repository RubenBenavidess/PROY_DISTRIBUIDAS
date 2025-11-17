import { validateToken } from "../../security/jwtManager.js";

export default function redirectAuthenticated(req, res, next){

    try{

        const token = req.cookies.accessToken;

        if(!token) return next();

        validateToken(token);

        throw new Error("Forbidden Access");
        

    }catch(e){
        if(e.message === "Forbidden Access") return next(e);    
        return next();
    }

}