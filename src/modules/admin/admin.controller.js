import crypto from "crypto";
import adminService from "./admin.service.js";
import asyncWrapper from "../../utils/asyncWrapper.js";
import AppError from "../../utils/AppError.js";
import { sendSuccess } from "../../utils/sendResponse.js";
import SiteSettings from "./siteSettings.model.js";
import Auth from "../auth/auth.model.js";
import Product from "../products/product.model.js";

class AdminController {
  getStats = asyncWrapper(async (req, res, next) => {
    const timeframe = req.query.timeframe || "today";
    const dashboardStats = await adminService.getDashboardStats(timeframe);
    return sendSuccess(res, dashboardStats, "Dashboard stats fetched");
  });

  getUsers = asyncWrapper(async (req, res, next) => {
    const usersResult = await adminService.getAllUsers(req.query);
    const usersMeta = {
      totalDocs: usersResult.total,
      page: usersResult.page,
      limit: usersResult.limit,
    };

    return sendSuccess(
      res,
      usersResult.users,
      "Users fetched successfully",
      200,
      usersMeta,
    );
  });

  suspendUser = asyncWrapper(async (req, res, next) => {
    const isSuspended = req.body.suspend === true;
    await adminService.suspendUser(req.params.id, isSuspended);
    return sendSuccess(
      res,
      null,
      isSuspended ? "User suspended" : "User reinstated",
    );
  });

  getSettings = asyncWrapper(async (req, res, next) => {
    let settings = await SiteSettings.findOne({});
    if (!settings) {
      settings = await SiteSettings.create({});
    }
    return sendSuccess(res, settings, "Settings retrieved successfully");
  });

  updateSettings = asyncWrapper(async (req, res, next) => {
    let settings = await SiteSettings.findOne({});
    if (!settings) {
      settings = new SiteSettings(req.body);
    } else {
      settings.set(req.body);
    }
    await settings.save();
    return sendSuccess(res, settings, "Settings updated successfully");
  });

  getAdminUsers = asyncWrapper(async (req, res, next) => {
    const admins = await Auth.find({
      role: { $in: ["admin", "super_admin"] },
    }).select("-password");
    return sendSuccess(res, admins, "Admin users retrieved successfully");
  });

  inviteAdmin = asyncWrapper(async (req, res, next) => {
    const { email, role } = req.body;

    // In a real app we would generate an invite token, save it to DB, and send an email.
    // For now we will return a mockup response.
    const inviteToken = crypto.randomBytes(32).toString("hex");

    return sendSuccess(
      res,
      { email, role, inviteToken },
      "Admin invitation sent successfully",
      201,
    );
  });

  bulkRestock = asyncWrapper(async (req, res, next) => {
    // Expected payload: { items: [ { productId: "...", quantity: 50 }, ... ] }
    const { items } = req.body;
    if (!Array.isArray(items)) {
      throw new AppError(
        "Items must be an array of objects specifying productId and quantity",
        400,
      );
    }

    const operations = items.map((item) => ({
      updateOne: {
        filter: { _id: item.productId },
        update: { $inc: { stockQty: item.quantity } },
      },
    }));

    // Perform bulk update
    const result = await Product.bulkWrite(operations);

    return sendSuccess(res, result, "Bulk restock completed successfully");
  });

  getInventory = asyncWrapper(async (req, res, next) => {
    const inventory = await adminService.getInventory(req.query.filter);
    return sendSuccess(res, inventory, "Inventory fetched successfully");
  });

  exportInventory = asyncWrapper(async (req, res, next) => {
    const csv = await adminService.getInventoryExport();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=inventory_${new Date().toISOString().split("T")[0]}.csv`,
    );
    return res.status(200).send(csv);
  });
}

export default new AdminController();
