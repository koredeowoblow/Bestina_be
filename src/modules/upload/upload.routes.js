import express from "express";
import uploadController from "./upload.controller.js";
import upload from "../../middlewares/upload.middleware.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.post("/", upload.single("image"), uploadController.uploadImage);
router.delete(
  "/:publicId",
  restrictTo("admin", "super_admin"),
  uploadController.deleteImage,
);

export default router;
