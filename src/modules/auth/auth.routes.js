import express from "express";
import authController from "./auth.controller.js";
import validate from "../../middlewares/validate.middleware.js";
import authValidation from "./auth.validation.js";
import { protect } from "../../middlewares/auth.middleware.js";
const router = express.Router();
import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
  max: 10,
  windowMs: 15 * 60 * 1000,
  message: "Too many login attempts, please try again later"
});

router.post(
  "/register",
  rateLimit({
    max: 10,
    windowMs: 15 * 60 * 1000,
    message: "Too many register attempts, please try again later"
  }),
  validate(authValidation.register),
  authController.register,
);
router.post("/login", loginLimiter, validate(authValidation.login), authController.login);
router.post(
  "/refresh",
  validate(authValidation.refresh),
  authController.refresh,
);
router.post("/logout", authController.logout); // Logout has its own token extraction logic

router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Protected Routes
router.use(protect);
router.get("/me", authController.getMe);

export default router;
