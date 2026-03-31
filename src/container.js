import cloudinary from "./config/cloudinary.config.js";
import { getRedisClient, isRedisAvailable } from "./config/redis.config.js";
import eventBus from "./utils/eventBus.js";
import CacheService from "./utils/cache.service.js";

import ProductModel from "./modules/products/product.model.js";
import { ProductRepository } from "./modules/products/product.repository.js";
import ProductService from "./modules/products/product.service.js";
import ProductController from "./modules/products/product.controller.js";

import UserModel from "./modules/auth/auth.model.js";
import UsersRepository from "./modules/users/users.repository.js";
import UsersService from "./modules/users/users.service.js";
import UsersController from "./modules/users/users.controller.js";

import OrderModel from "./modules/orders/order.model.js";
import { OrderRepository } from "./modules/orders/order.repository.js";
import OrderService from "./modules/orders/order.service.js";
import OrderController from "./modules/orders/order.controller.js";

import cartService from "./modules/cart/cart.service.js";
import UploadService from "./modules/upload/upload.service.js";

const imageUploadService = new UploadService({ cloudinary, folder: "bestina" });
const cacheService = new CacheService({ isRedisAvailable, getRedisClient });

const productRepository = new ProductRepository({ ProductModel });
const productService = new ProductService({
  productRepository,
  imageUploadService,
  cacheService,
  eventBus,
});
const productController = new ProductController({ productService });

const usersRepository = new UsersRepository({ UserModel });
const usersService = new UsersService({
  usersRepository,
  imageUploadService,
});
const usersController = new UsersController({ usersService });

const orderRepository = new OrderRepository({ OrderModel });
const orderService = new OrderService({
  orderRepository,
  cartService,
  productService,
});
const orderController = new OrderController({ orderService });

eventBus.on("order.paid", async (order) => {
  try {
    await productService.reduceStockForOrder(order.items);
  } catch (error) {
    console.error("Failed to dynamically reduce stock via EventBus:", error);
  }
});

export {
  cacheService,
  imageUploadService,
  orderController,
  orderService,
  productController,
  productService,
  usersController,
  usersService,
};
