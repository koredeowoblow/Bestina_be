import express from "express";
import authController from "./auth.controller.js";
import validate from "../../middlewares/validate.middleware.js";
import authValidation from "./auth.validation.js";
import { protect } from "../../middlewares/auth.middleware.js";
const router = express.Router();

router.post(
  "/register",
  validate(authValidation.register),
  authController.register,
);
router.post("/login", validate(authValidation.login), authController.login);
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
