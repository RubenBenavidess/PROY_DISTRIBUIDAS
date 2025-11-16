import { validateToken } from "../../security/jwtManager.js";

/**
 * Middleware to protect routes that require authentication
 */
export default function requireAuth(req, res, next) {
    const TOKEN_HEADER_KEY = process.env.TOKEN_HEADER_KEY || 'Authorization';

    try {
        let token;
        const headerValue = req.header(TOKEN_HEADER_KEY);
        
        if (headerValue?.startsWith("Bearer ")) {
            token = headerValue.slice(7);
        }

        if (!token) {
            throw new Error("No token provided");
        }

        const decoded = validateToken(token);

        if (!decoded) {
            throw new Error("Invalid token");
        }

        // Attach user info to request
        req.user = decoded;
        
        return next();

    } catch (e) {
        return next(new Error("Unauthorized"));
    }
}
