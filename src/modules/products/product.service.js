import mongoose from "mongoose";
import AppError from "../../utils/AppError.js";
import CategoryRepository from "../categories/category.repository.js";
import {
  assertCloudinaryImageRecords,
  parseExistingImagesInput,
} from "../../utils/image-upload.util.js";

const CACHE_PREFIX = "products_";
const CACHE_TTL = 300; // 5 minutes

class ProductService {
  constructor({
    productRepository,
    imageUploadService,
    cacheService,
    eventBus,
    appErrorClass = AppError,
  }) {
    if (!productRepository) {
      throw new Error("ProductService requires productRepository");
    }
    if (!imageUploadService) {
      throw new Error("ProductService requires imageUploadService");
    }
    if (!cacheService) {
      throw new Error("ProductService requires cacheService");
    }
    if (!eventBus) {
      throw new Error("ProductService requires eventBus");
    }

    this.productRepository = productRepository;
    this.imageUploadService = imageUploadService;
    this.cacheService = cacheService;
    this.eventBus = eventBus;
    this.AppError = appErrorClass;
  }

  async getProducts(query, isAdmin = false) {
    let version = "v1";
    const cachedVersion = await this.cacheService.get("products_version");
    version = cachedVersion || version;

    // Generate cache key based on query params and global version
    const queryHash = Buffer.from(JSON.stringify(query)).toString("base64");
    const cacheKey = `${CACHE_PREFIX}${version}_${isAdmin ? "admin_" : ""}${queryHash}`;

    const cachedProducts = await this.cacheService.get(cacheKey);
    if (cachedProducts) {
      return JSON.parse(cachedProducts);
    }

    // Build filter
    const filter = {};
    if (!isAdmin) {
      filter.isArchived = false;
    }
    if (query.category) {
      if (mongoose.Types.ObjectId.isValid(query.category)) {
        filter.category = query.category;
      } else {
        const category = await CategoryRepository.findBySlug(query.category);
        if (category) {
          filter.category = category._id;
        } else {
          // If slug not found, use a non-existent ID to return empty results
          filter.category = new mongoose.Types.ObjectId();
        }
      }
    }
    if (query.brand) filter.brand = query.brand;
    if (query.in_stock === true) filter.stock = { $gt: 0 };
    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) filter.price.$gte = Number(query.minPrice);
      if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
    }
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    // Build options
    const options = {
      page: parseInt(query.page, 10) || 1,
      limit: parseInt(query.limit, 10) || 20,
      populate: { path: "category", select: "name slug" },
      lean: true,
    };

    if (query.sort) {
      options.sort = query.sort; // e.g. "price" or "-price"
    } else if (query.search) {
      options.sort = { score: { $meta: "textScore" } };
    }

    const result = await this.productRepository.paginateProducts(
      filter,
      options,
    );

    await this.cacheService.set(cacheKey, JSON.stringify(result), {
      EX: CACHE_TTL,
    });

    return result;
  }

  async getProductById(id) {
    const cacheKey = `product_${id}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const product = await this.productRepository.findById(id);
    if (!product || product.isArchived) {
      throw new this.AppError("Product not found", 404);
    }

    await this.cacheService.set(cacheKey, JSON.stringify(product), { EX: CACHE_TTL });
    return product;
  }

  async invalidateCache() {
    await this.cacheService.increment("products_version");
  }

  async createProduct(data) {
    // Never trust image payload strings/objects from clients.
    delete data.images;
    delete data.existingImages;

    let uploadResults = [];

    // Handle single file (imageBuffer) or multiple files (imageBuffers)
    if (data.imageBuffer) {
      const result = await this.imageUploadService.uploadImage(
        data.imageBuffer,
      );
      uploadResults.push(result);
    } else if (data.imageBuffers && data.imageBuffers.length > 0) {
      uploadResults = await this.imageUploadService.uploadImages(
        data.imageBuffers,
      );
    }

    if (uploadResults.length === 0) {
      throw new this.AppError("Product image file is required", 400);
    }

    // 🚀 Only Cloudinary result gets saved
    assertCloudinaryImageRecords(uploadResults);
    data.images = uploadResults;

    // Clean up temporary buffers
    delete data.imageBuffer;
    delete data.imageBuffers;

    const product = await this.productRepository.create(data);
    await this.invalidateCache();
    return product;
  }

  async updateProduct(id, data) {
    const product = await this.productRepository.findById(id);
    if (!product) throw new this.AppError("Product not found", 404);

    delete data.images;

    const hasNewFiles =
      Boolean(data.imageBuffer) ||
      (Array.isArray(data.imageBuffers) && data.imageBuffers.length > 0);
    const hasExistingImagesPayload = data.existingImages !== undefined;

    if (hasNewFiles || hasExistingImagesPayload) {
      const existingImageUrls = hasExistingImagesPayload
        ? parseExistingImagesInput(data.existingImages)
        : [];

      const currentImages = Array.isArray(product.images) ? product.images : [];
      const currentImageByUrl = new Map(
        currentImages.map((img) => [img.url, img]),
      );

      const keptExistingImages = existingImageUrls.map((url) => {
        const existing = currentImageByUrl.get(url);
        if (!existing) {
          throw new this.AppError(
            "existingImages contains a URL that does not belong to this product",
            400,
          );
        }
        return existing;
      });

      let uploadedImages = [];
      if (data.imageBuffer) {
        uploadedImages = [
          await this.imageUploadService.uploadImage(data.imageBuffer),
        ];
      } else if (
        Array.isArray(data.imageBuffers) &&
        data.imageBuffers.length > 0
      ) {
        uploadedImages = await this.imageUploadService.uploadImages(
          data.imageBuffers,
        );
      }

      const finalImages = [...keptExistingImages, ...uploadedImages];
      if (finalImages.length === 0) {
        throw new this.AppError(
          "Product must have at least one valid image",
          400,
        );
      }

      assertCloudinaryImageRecords(finalImages);

      const finalUrlSet = new Set(finalImages.map((img) => img.url));
      const removedImages = currentImages.filter(
        (img) => !finalUrlSet.has(img.url),
      );
      const deletePromises = removedImages.map((img) =>
        img.publicId
          ? this.imageUploadService.deleteImage(img.publicId)
          : Promise.resolve(),
      );
      await Promise.all(deletePromises);

      data.images = finalImages;
    }

    delete data.existingImages;
    delete data.imageBuffer;
    delete data.imageBuffers;

    const updatedProduct = await this.productRepository.update(id, data);
    await this.invalidateCache();
    return updatedProduct;
  }

  async deleteProduct(id) {
    const product = await this.productRepository.findById(id);
    if (!product) throw new this.AppError("Product not found", 404);

    // Delete images from Cloudinary before soft deleting/archiving
    const images = product.images || [];
    const deletePromises = images.map((img) =>
      img.publicId
        ? this.imageUploadService.deleteImage(img.publicId)
        : Promise.resolve(),
    );
    await Promise.all(deletePromises);

    const deletedProduct = await this.productRepository.softDelete(id);
    await this.invalidateCache();
    return deletedProduct;
  }

  async reduceStockForOrder(orderItems, session = null) {
    if (!orderItems || orderItems.length === 0) return;
    
    for (const item of orderItems) {
      const productId = item.product._id || item.product;
      const updated = await this.productRepository.update(
        productId,
        { $inc: { stock: -item.qty } },
        session,
        { stock: { $gte: item.qty } } // Prevents negative stock (atomic check)
      );

      if (!updated) {
        throw new this.AppError(`Insufficient stock for product ID: ${productId}`, 400);
      }
      
      await this.cacheService.del(`product_${productId}`);
    }
    
    await this.invalidateCache(); // Still invalidate list pages
  }
}

export default ProductService;
