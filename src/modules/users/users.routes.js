import express from "express";
import userController from "./users.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";
import upload from "../../middlewares/upload.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/profile", userController.getProfile);
router.patch(
  "/profile",
  upload.single("photo"),
  (req, res, next) => {
    if (req.file) {
      req.body.photoBuffer = req.file.buffer;
    }
    next();
  },
  userController.updateProfile,
);

router.get("/me/addresses", userController.getAddresses);
router.post("/me/addresses", userController.addAddress);
router.delete("/me/addresses/:id", userController.deleteAddress);

export default router;
