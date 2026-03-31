import asyncWrapper from "../../utils/asyncWrapper.js";
import { sendSuccess } from "../../utils/sendResponse.js";
import AppError from "../../utils/AppError.js";
import ShippingZone from "./shippingZone.model.js";
import SiteSettings from "../admin/siteSettings.model.js";

class ShippingController {
  // Public
  getShippingZones = asyncWrapper(async (req, res, next) => {
    const zones = await ShippingZone.find({ isActive: true }).sort({
      order: 1,
    });
    const settings = await SiteSettings.getOrCreate();

    return sendSuccess(
      res,
      {
        zones,
        freeShippingThresholdKobo: settings.freeShippingThresholdKobo,
      },
      "Shipping zones fetched successfully",
    );
  });

  // Admin
  getAllShippingZones = asyncWrapper(async (req, res, next) => {
    const zones = await ShippingZone.find().sort({ order: 1 });
    return sendSuccess(res, zones, "All shipping zones fetched successfully");
  });

  createShippingZone = asyncWrapper(async (req, res, next) => {
    const zone = await ShippingZone.create(req.body);
    return sendSuccess(res, zone, "Shipping zone created successfully", 201);
  });

  updateShippingZone = asyncWrapper(async (req, res, next) => {
    const zone = await ShippingZone.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!zone) throw new AppError("Shipping zone not found", 404);
    return sendSuccess(res, zone, "Shipping zone updated successfully");
  });

  toggleShippingZone = asyncWrapper(async (req, res, next) => {
    const zone = await ShippingZone.findById(req.params.id);
    if (!zone) throw new AppError("Shipping zone not found", 404);
    zone.isActive = !zone.isActive;
    await zone.save();
    return sendSuccess(
      res,
      zone,
      `Shipping zone ${zone.isActive ? "activated" : "deactivated"} successfully`,
    );
  });

  deleteShippingZone = asyncWrapper(async (req, res, next) => {
    const zone = await ShippingZone.findByIdAndDelete(req.params.id);
    if (!zone) throw new AppError("Shipping zone not found", 404);
    return sendSuccess(res, null, "Shipping zone deleted successfully");
  });
}

export default new ShippingController();
