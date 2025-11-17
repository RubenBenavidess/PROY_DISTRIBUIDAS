import { Router } from "express";
import redirectAuthenticated from "../middleware/auth/redirectAuthenticated.js";
import { login, verifySession, logout } from "../controllers/authController.js";

const router = Router();

router.post("/auth/login", redirectAuthenticated, login);
router.get("/auth/verify", verifySession);
router.post("/auth/logout", logout);

export default router;

