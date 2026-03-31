import express from "express";
import checkoutController from "./checkout.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);
router.post("/quote", checkoutController.quote);

export default router;
