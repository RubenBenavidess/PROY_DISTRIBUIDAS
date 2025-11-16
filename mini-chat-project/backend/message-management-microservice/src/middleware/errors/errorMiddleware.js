import { ZodError } from "zod";

export default function handleErrors(err, req, res, next) {

    console.log(`Error: ${err.message}`);
    console.log(err.stack);

    const errorResponse = {
        success: false,
        message: err.message || "Internal Server Error"
    }
    let code = 500;

    // -- Validation Errors --

    if (err.message === "ValidationError") {
        code = 400;
        errorResponse.message = `Invalid Data: ${err.message}`;
    }

    if (err instanceof ZodError) {
        code = 400;
        errorResponse.message = `Invalid Input Data`;
        errorResponse.errors = err.errors;
    }

    // -- Authentication Errors --

    if (err.message === "Invalid Credentials") {
        code = 401;
        errorResponse.message = "Invalid Credentials";
    }

    if (err.message === "Unauthorized" || err.message === "No token provided" || err.message === "Invalid token") {
        code = 401;
        errorResponse.message = "Unauthorized: Authentication required";
    }

    if (err.message === "Forbidden Access") {
        code = 403;
        errorResponse.message = "Forbidden Access: There is already a session activated";
    }

    // -- Not Found Errors --

    if (err.message === "Room not found" || err.message === "Message not found") {
        code = 404;
        errorResponse.message = err.message;
    }

    // -- Conflict Errors --

    if (err.message === "Room is full" || err.message === "Invalid PIN") {
        code = 409;
        errorResponse.message = err.message;
    }

    return res.status(code).json(errorResponse);

}
