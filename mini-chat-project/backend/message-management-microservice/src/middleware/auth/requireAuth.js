import { validateToken } from "../../security/jwtManager.js";

/**
 * Middleware to protect routes that require authentication
 */
export default function requireAuth(req, res, next) {

    try {
        const token = req.cookies.accessToken;

        if (!token) {
            throw new Error("No token provided");
        }

        const decoded = validateToken(token);

        req.user = decoded;
        
        return next();

    } catch (e) {
        return next(e);
    }
}
