import asyncWrapper from "../../utils/asyncWrapper.js";
import { sendSuccess } from "../../utils/sendResponse.js";
import Review from "../reviews/review.model.js";
import AppError from "../../utils/AppError.js";
import Order from "../orders/order.model.js";

class ProductController {
  constructor({ productService }) {
    if (!productService) {
      throw new Error("ProductController requires productService");
    }

    this.productService = productService;
    this.getProducts = asyncWrapper(this.getProducts.bind(this));
    this.getProductById = asyncWrapper(this.getProductById.bind(this));
    this.createProduct = asyncWrapper(this.createProduct.bind(this));
    this.updateProduct = asyncWrapper(this.updateProduct.bind(this));
    this.deleteProduct = asyncWrapper(this.deleteProduct.bind(this));
    this.getProductReviews = asyncWrapper(this.getProductReviews.bind(this));
    this.createProductReview = asyncWrapper(
      this.createProductReview.bind(this),
    );
  }

  async getProducts(req, res, next) {
    const isAdmin =
      req.user && ["admin", "super_admin"].includes(req.user.role);
    const productsResult = await this.productService.getProducts(
      req.query,
      isAdmin,
    );
    const productsMeta = {
      totalDocs: productsResult.totalDocs,
      limit: productsResult.limit,
      totalPages: productsResult.totalPages,
      page: productsResult.page,
      pagingCounter: productsResult.pagingCounter,
      hasPrevPage: productsResult.hasPrevPage,
      hasNextPage: productsResult.hasNextPage,
      prevPage: productsResult.prevPage,
      nextPage: productsResult.nextPage,
    };

    return sendSuccess(
      res,
      productsResult.docs,
      "Products fetched successfully",
      200,
      productsMeta,
    );
  }

  async getProductById(req, res, next) {
    const product = await this.productService.getProductById(req.params.id);
    return sendSuccess(res, product, "Product fetched successfully");
  }

  async createProduct(req, res, next) {
    req.body.createdBy = req.user._id;
    const product = await this.productService.createProduct(req.body);
    return sendSuccess(res, product, "Product created successfully", 201);
  }

  async updateProduct(req, res, next) {
    const product = await this.productService.updateProduct(
      req.params.id,
      req.body,
    );
    return sendSuccess(res, product, "Product updated successfully");
  }

  async deleteProduct(req, res, next) {
    await this.productService.deleteProduct(req.params.id);
    return sendSuccess(res, null, "Product deleted (archived) successfully");
  }

  async getProductReviews(req, res, next) {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const reviews = await Review.find({ product: req.params.id })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort("-createdAt");

    const totalCount = await Review.countDocuments({ product: req.params.id });

    return sendSuccess(
      res,
      {
        reviews,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
      },
      "Reviews fetched successfully",
    );
  }

  async createProductReview(req, res, next) {
    const { rating, comment } = req.body;
    const productId = req.params.id;
    const userId = req.user._id;

    // Check existing review
    const existing = await Review.findOne({ product: productId, user: userId });
    if (existing) {
      throw new AppError("You have already reviewed this product", 400);
    }

    // Check verified purchase
    const order = await Order.findOne({
      user: userId,
      "items.product": productId,
      orderStatus: "delivered",
    });

    const review = await Review.create({
      product: productId,
      user: userId,
      userName: req.user.name,
      rating,
      comment,
      verifiedPurchase: !!order,
    });

    return sendSuccess(res, review, "Review created successfully", 201);
  }
}

export default ProductController;
