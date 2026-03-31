import express from "express";
import { usersController } from "../../container.js";
import { protect } from "../../middlewares/auth.middleware.js";
import upload from "../../middlewares/upload.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/profile", usersController.getProfile);
router.patch(
  "/profile",
  upload.single("photo"),
  (req, res, next) => {
    if (req.file) {
      req.body.photoBuffer = req.file.buffer;
    }
    next();
  },
  usersController.updateProfile,
);

router.get("/me/addresses", usersController.getAddresses);
router.post("/me/addresses", usersController.addAddress);
router.patch("/me/addresses/:id", usersController.updateAddress);
router.delete("/me/addresses/:id", usersController.deleteAddress);

router.put("/me/preferences", usersController.updatePreferences);

router.patch(
  "/me/avatar",
  upload.single("image"),
  (req, res, next) => {
    if (req.file) {
      req.body.photoBuffer = req.file.buffer;
    }
    next();
  },
  usersController.updateAvatar,
);

export default router;
