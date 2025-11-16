import { ZodError } from "zod";

export default function handleErrors(err, req, res, next){

    console.log(err.stack);

    const errorResponse = {
        success: false,
        message: err.message || "Internal Server Error"
    }
    let code = 500;

    // -- Validation Errors --

    if(err.message === "ValidationError"){
        code = 400;
        errorResponse.message = `Invalid Data: ${err.message}`;
    }

    if(err instanceof ZodError){
        code = 400;
        errorResponse.message = `Invalid Input Data`;
        errorResponse.errors = err.errors;
    }

    // -- Status Errors --

    if(err.message === "Invalid Credentials"){
        code = 401;
        errorResponse.message = "Invalid Credentials";
    }

    if(err.message === "Forbidden Access"){
        code = 403;
        errorResponse.message = "Forbidden Access: There is already a session activated";
    }

    return res.status(code).json(errorResponse);

}