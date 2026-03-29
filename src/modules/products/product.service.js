import productRepo from "./product.repository.js";
import { getRedisClient, isRedisAvailable } from "../../config/redis.config.js";
import AppError from "../../utils/AppError.js";
import eventBus from "../../utils/eventBus.js";
import uploadService from "../upload/upload.service.js";
import {
  assertCloudinaryImageRecords,
  parseExistingImagesInput,
} from "../../utils/image-upload.util.js";

const CACHE_PREFIX = "products_";
const CACHE_TTL = 300; // 5 minutes

class ProductService {
  async getProducts(query, isAdmin = false) {
    let version = "v1";
    if (isRedisAvailable()) {
      const redisClient = await getRedisClient();
      version = (await redisClient.get("products_version")) || "v1";
    }

    // Generate cache key based on query params and global version
    const queryHash = Buffer.from(JSON.stringify(query)).toString("base64");
    const cacheKey = `${CACHE_PREFIX}${version}_${isAdmin ? "admin_" : ""}${queryHash}`;

    // Try cache first
    if (isRedisAvailable()) {
      const redisClient = await getRedisClient();
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Build filter
    const filter = {};
    if (!isAdmin) {
      filter.isArchived = false;
    }
    if (query.category) filter.category = query.category;
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

    const result = await productRepo.paginateProducts(filter, options);

    // Save to cache
    if (isRedisAvailable()) {
      const redisClient = await getRedisClient();
      await redisClient.set(cacheKey, JSON.stringify(result), {
        EX: CACHE_TTL,
      });
    }

    return result;
  }

  async getProductById(id) {
    // Single product fetch (could be cached too, but let's stick to list cache as requested)
    const product = await productRepo.findById(id);
    if (!product || product.isArchived) {
      throw new AppError("Product not found", 404);
    }
    // TODO: Fetch related products based on category/brand if necessary
    return product;
  }

  async invalidateCache() {
    // O(1) invalidation: atomic increment of global version key seamlessly orphans all standing caches
    if (!isRedisAvailable()) return;
    const redisClient = await getRedisClient();
    await redisClient.incr("products_version");
  }

  async createProduct(data) {
    // Never trust image payload strings/objects from clients.
    delete data.images;
    delete data.existingImages;

    let uploadResults = [];

    // Handle single file (imageBuffer) or multiple files (imageBuffers)
    if (data.imageBuffer) {
      const result = await uploadService.uploadImage(data.imageBuffer);
      uploadResults.push(result);
    } else if (data.imageBuffers && data.imageBuffers.length > 0) {
      uploadResults = await uploadService.uploadImages(data.imageBuffers);
    }

    if (uploadResults.length === 0) {
      throw new AppError("Product image file is required", 400);
    }

    // 🚀 Only Cloudinary result gets saved
    assertCloudinaryImageRecords(uploadResults);
    data.images = uploadResults;

    // Clean up temporary buffers
    delete data.imageBuffer;
    delete data.imageBuffers;

    const product = await productRepo.create(data);
    await this.invalidateCache();
    return product;
  }

  async updateProduct(id, data) {
    const product = await productRepo.findById(id);
    if (!product) throw new AppError("Product not found", 404);

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
          throw new AppError(
            "existingImages contains a URL that does not belong to this product",
            400,
          );
        }
        return existing;
      });

      let uploadedImages = [];
      if (data.imageBuffer) {
        uploadedImages = [await uploadService.uploadImage(data.imageBuffer)];
      } else if (
        Array.isArray(data.imageBuffers) &&
        data.imageBuffers.length > 0
      ) {
        uploadedImages = await uploadService.uploadImages(data.imageBuffers);
      }

      const finalImages = [...keptExistingImages, ...uploadedImages];
      if (finalImages.length === 0) {
        throw new AppError("Product must have at least one valid image", 400);
      }

      assertCloudinaryImageRecords(finalImages);

      const finalUrlSet = new Set(finalImages.map((img) => img.url));
      const removedImages = currentImages.filter(
        (img) => !finalUrlSet.has(img.url),
      );
      const deletePromises = removedImages.map((img) =>
        img.publicId
          ? uploadService.deleteImage(img.publicId)
          : Promise.resolve(),
      );
      await Promise.all(deletePromises);

      data.images = finalImages;
    }

    delete data.existingImages;
    delete data.imageBuffer;
    delete data.imageBuffers;

    const updatedProduct = await productRepo.update(id, data);
    await this.invalidateCache();
    return updatedProduct;
  }

  async deleteProduct(id) {
    const product = await productRepo.findById(id);
    if (!product) throw new AppError("Product not found", 404);

    // Delete images from Cloudinary before soft deleting/archiving
    const images = product.images || [];
    const deletePromises = images.map((img) =>
      img.publicId
        ? uploadService.deleteImage(img.publicId)
        : Promise.resolve(),
    );
    await Promise.all(deletePromises);

    const deletedProduct = await productRepo.softDelete(id);
    await this.invalidateCache();
    return deletedProduct;
  }

  async reduceStockForOrder(orderItems) {
    if (!orderItems || orderItems.length === 0) return;
    const promises = orderItems.map((item) =>
      productRepo.update(item.product._id || item.product, {
        $inc: { stock: -item.qty },
      }),
    );
    await Promise.all(promises);
    await this.invalidateCache();
  }
}

const productService = new ProductService();

eventBus.on("order.paid", async (order) => {
  try {
    await productService.reduceStockForOrder(order.items);
  } catch (err) {
    console.error("Failed to dynamically reduce stock via EventBus:", err);
  }
});

export default productService;
