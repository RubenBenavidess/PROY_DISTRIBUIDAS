import { validateToken } from "../../security/jwtManager.js";

export default function redirectAuthenticated(req, res, next){

    const TOKEN_HEADER_KEY = process.env.TOKEN_HEADER_KEY;    

    try{

        let token;
        const headerValue = req.header(TOKEN_HEADER_KEY);
        if (headerValue?.startsWith("Bearer ")) {
          token = headerValue.slice(7);
        }

        if(!token){
            return next();
        }

        const verified = validateToken(token);

        if(!verified)
            return next();            

        throw new Error("Forbidden Access");

    }catch(e){
        return next();
    }

}