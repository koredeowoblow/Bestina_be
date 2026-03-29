import express from "express";
import productController from "./product.controller.js";
import validate from "../../middlewares/validate.middleware.js";
import productValidation from "./product.validation.js";
import { protect, restrictTo } from "../../middlewares/auth.middleware.js";
import upload from "../../middlewares/upload.middleware.js";

const router = express.Router();

const productImageUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 10 },
]);

// Helper to extract file buffer(s) for the service
const prepareFileUpload = (req, res, next) => {
  const singleImage = req.files?.image?.[0];
  const multipleImages = req.files?.images || [];

  if (singleImage) {
    req.body.imageBuffer = singleImage.buffer;
  }

  if (multipleImages.length > 0) {
    req.body.imageBuffers = multipleImages.map((file) => file.buffer);

    // If both are provided, keep all as multiple buffers for the service.
    if (singleImage) {
      req.body.imageBuffers.unshift(singleImage.buffer);
      delete req.body.imageBuffer;
    }
  }

  next();
};

// Public routes
router.get(
  "/",
  validate(productValidation.query, "query"),
  productController.getProducts,
);
router.get("/:id", productController.getProductById);

// Admin routes
router.use(protect, restrictTo("admin", "super_admin"));

router.post(
  "/",
  productImageUpload,
  prepareFileUpload,
  validate(productValidation.create),
  productController.createProduct,
);

router.patch(
  "/:id",
  productImageUpload,
  prepareFileUpload,
  validate(productValidation.update),
  productController.updateProduct,
);

router.delete("/:id", productController.deleteProduct);

export default router;
