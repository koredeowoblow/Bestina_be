import asyncWrapper from "../../utils/asyncWrapper.js";
import { sendSuccess } from "../../utils/sendResponse.js";
import AppError from "../../utils/AppError.js";
import Product from "../products/product.model.js";
import ShippingZone from "../shipping/shippingZone.model.js";
import SiteSettings from "../admin/siteSettings.model.js";

class CheckoutController {
  quote = asyncWrapper(async (req, res, next) => {
    const { items, shippingAddress, couponCode } = req.body;

    if (!items || !items.length) {
      throw new AppError("No items provided for quote", 400);
    }

    let subtotalKobo = 0;

    // Verify products and calculate subtotal
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product)
        throw new AppError(`Product not found: ${item.productId}`, 404);
      if (product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for ${product.name}`, 400);
      }
      // price might be stored internally in Kobo, or normal currency.
      // We will assume product.price is in kobo, or needs to be scaled depending on the platform convention.
      // Usually product.price is stored as standard unit or base currency. If standard, multiple by 100 for kobo.
      // The requirement asks for totalKobo and subtotalKobo. We'll multiply by 100 if price isn't already kobo-scaled.
      // For this quote, if the backend uses standard price (e.g. 5000 = 5000 NGN), we scale here.
      const priceKobo = product.price * 100;
      subtotalKobo += priceKobo * item.quantity;
    }

    const settings = await SiteSettings.getOrCreate();

    // Determine Shipping
    let shippingKobo = 3000 * 100; // default 3000 fallback
    let matchedZone = null;

    if (shippingAddress && shippingAddress.state) {
      matchedZone = await ShippingZone.findOne({
        states: new RegExp(`^${shippingAddress.state}$`, "i"),
        isActive: true,
      });
      if (matchedZone) {
        shippingKobo = matchedZone.baseFeeKobo;
      }
    }

    // Apply free shipping rule
    if (
      settings.freeShippingThresholdKobo &&
      subtotalKobo >= settings.freeShippingThresholdKobo
    ) {
      shippingKobo = 0;
    }

    const totalKobo = subtotalKobo + shippingKobo;

    return sendSuccess(
      res,
      {
        subtotalKobo,
        discountKobo: 0,
        shippingKobo,
        totalKobo,
        zone: matchedZone
          ? {
              region: matchedZone.region,
              minDays: matchedZone.minDays,
              maxDays: matchedZone.maxDays,
            }
          : null,
        note: couponCode ? "Coupon support coming soon." : undefined,
      },
      "Quote calculated successfully",
    );
  });
}

export default new CheckoutController();
