import productService from './product.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

class ProductController {
  getProducts = asyncWrapper(async (req, res, next) => {
    // Optional admin context to fetch archived products
    const isAdmin = req.user && ['admin', 'super_admin'].includes(req.user.role);

    const result = await productService.getProducts(req.query, isAdmin);

    res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: result.docs,
      meta: {
        totalDocs: result.totalDocs,
        limit: result.limit,
        totalPages: result.totalPages,
        page: result.page,
        pagingCounter: result.pagingCounter,
        hasPrevPage: result.hasPrevPage,
        hasNextPage: result.hasNextPage,
        prevPage: result.prevPage,
        nextPage: result.nextPage
      }
    });
  });

  getProductById = asyncWrapper(async (req, res, next) => {
    const product = await productService.getProductById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Product fetched successfully',
      data: product
    });
  });

  createProduct = asyncWrapper(async (req, res, next) => {
    // Inject creator
    req.body.createdBy = req.user._id;
    const product = await productService.createProduct(req.body);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  });

  updateProduct = asyncWrapper(async (req, res, next) => {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  });

  deleteProduct = asyncWrapper(async (req, res, next) => {
    await productService.deleteProduct(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Product deleted (archived) successfully',
      data: null
    });
  });
}


export default new ProductController();
