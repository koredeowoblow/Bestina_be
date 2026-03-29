import categoryService from './category.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';


class CategoryController {
  getAllCategories = asyncWrapper(async (req, res, next) => {
    const isAdmin = req.user && ['admin', 'super_admin'].includes(req.user.role);
    const categories = await categoryService.getAllCategories(isAdmin);

    res.status(200).json({
      success: true,
      message: 'Categories fetched successfully',
      data: categories
    });
  });

  createCategory = asyncWrapper(async (req, res, next) => {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  });

  updateCategory = asyncWrapper(async (req, res, next) => {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  });

  deleteCategory = asyncWrapper(async (req, res, next) => {
    await categoryService.deleteCategory(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      data: null
    });
  });
}

export default new CategoryController();
