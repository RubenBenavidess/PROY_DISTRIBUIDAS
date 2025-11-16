import { validateToken } from "../../security/jwtManager.js";

export default function redirectAuthenticated(req, res, next){

    const TOKEN_HEADER_KEY = process.env.TOKEN_HEADER_KEY;    

    try{

        let token;
        const headerValue = req.header(TOKEN_HEADER_KEY);
        if(headerValue?.startsWith("Bearer ")) {
            token = headerValue.slice(7);
        }

        validateToken(token);

        throw new Error("Forbidden Access");
        

    }catch(e){
        if(e.message === "Forbidden Access") return next(e);    
        return next();
    }

}