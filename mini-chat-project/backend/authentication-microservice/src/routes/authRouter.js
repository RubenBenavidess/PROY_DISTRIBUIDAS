import { Router } from "express";
import redirectAuthenticated from "../middleware/auth/redirectAuthenticated.js";
import { login } from "../controllers/authController.js";

const router = Router();

router.post("/auth/login", redirectAuthenticated, login);

export default router;

