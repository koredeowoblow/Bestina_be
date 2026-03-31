import express from "express";
import contentController from "./content.controller.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/:key", contentController.getContent);

// Admin operations
router.put(
  "/:key",
  protect,
  restrictTo("admin", "super_admin"),
  contentController.updateContent,
);

export default router;
