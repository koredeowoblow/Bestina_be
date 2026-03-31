import categoryService from "./category.service.js";
import asyncWrapper from "../../utils/asyncWrapper.js";
import { sendSuccess } from "../../utils/sendResponse.js";

class CategoryController {
  getAllCategories = asyncWrapper(async (req, res, next) => {
    const isAdmin =
      req.user && ["admin", "super_admin"].includes(req.user.role);
    const categories = await categoryService.getAllCategories(isAdmin);
    return sendSuccess(res, categories, "Categories fetched successfully");
  });

  createCategory = asyncWrapper(async (req, res, next) => {
    const category = await categoryService.createCategory(req.body);
    return sendSuccess(res, category, "Category created successfully", 201);
  });

  updateCategory = asyncWrapper(async (req, res, next) => {
    const category = await categoryService.updateCategory(
      req.params.id,
      req.body,
    );
    return sendSuccess(res, category, "Category updated successfully");
  });

  deleteCategory = asyncWrapper(async (req, res, next) => {
    await categoryService.deleteCategory(req.params.id);
    return sendSuccess(res, null, "Category deleted successfully");
  });
}

export default new CategoryController();
