import { Router } from "express";
import redirectAuthenticated from "../middleware/auth/redirectAuthenticated";
import { login } from "../controllers/authController";

const router = Router();

router.post("/auth/login", redirectAuthenticated, login);

export default router;

