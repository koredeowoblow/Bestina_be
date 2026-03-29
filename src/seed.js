import mongoose from "mongoose";
import dotenv from "dotenv";
import "./env.js";
import User from "./modules/auth/auth.model.js";
import Category from "./modules/categories/category.model.js";
import Product from "./modules/products/product.model.js";
import Order from "./modules/orders/order.model.js";
import Cart from "./modules/cart/cart.model.js";
import Payment from "./modules/payments/payment.model.js";
import Return from "./modules/returns/return.model.js";
import { connectMongoDB } from "./config/db.config.js";

const seedData = async () => {
  try {
    await connectMongoDB();

    // 1. Clear existing data
    console.log("Clearing existing data...");
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Cart.deleteMany({}),
      Payment.deleteMany({}),
      Return.deleteMany({}),
    ]);

    // 2. Seed Users
    console.log("Seeding users...");
    const users = await User.create([
      {
        name: "Super Admin",
        email: "superadmin@bestina.com",
        password: "Password123!",
        role: "super_admin",
        isVerified: true,
      },
      {
        name: "Admin User",
        email: "admin@bestina.com",
        password: "Password123!",
        role: "admin",
        isVerified: true,
      },
      {
        name: "Sample Customer",
        email: "customer@example.com",
        password: "Password123!",
        role: "user",
        isVerified: true,
        addresses: [
          {
            street: "123 Health St",
            city: "Lagos",
            state: "Lagos",
            country: "Nigeria",
            zipCode: "100001",
            isDefault: true,
          },
        ],
      },
    ]);

    const superAdminId = users[0]._id;
    const adminId = users[1]._id;
    const customer = users[2];

    // 3. Seed Categories
    console.log("Seeding categories...");
    const categories = await Category.create([
      {
        name: "Medical Wear",
        slug: "medical-wear",
        description: "Professional scrubs and lab coats",
      },
      {
        name: "Antibiotics",
        slug: "antibiotics",
        description: "Prescription bacterial infection treatments",
      },
      {
        name: "Pain Relief",
        slug: "pain-relief",
        description: "Over-the-counter and prescription analgesics",
      },
      {
        name: "Skincare",
        slug: "skincare",
        description: "Dermatological and therapeutic skincare",
      },
      {
        name: "Equipment",
        slug: "equipment",
        description: "Diagnostic and monitoring tools",
      },
    ]);

    // 4. Seed Products
    console.log("Seeding products...");
    const products = await Product.create([
      {
        name: "Premium Blue Scrubs",
        description: "Anti-microbial, breatheable blue scrubs for surgeons.",
        brand: "Bestina Wear",
        category: categories[0]._id, // Medical Wear
        price: 25000,
        stock: 50,
        images: [
          {
            url: "https://res.cloudinary.com/demo/image/upload/v1/scrubs.jpg",
            publicId: "scrubs_1",
          },
        ],
        createdBy: adminId,
      },
      {
        name: "Standard Lab Coat",
        description: "White cotton lab coat, knee length, multiple pockets.",
        brand: "Bestina Wear",
        category: categories[0]._id, // Medical Wear
        price: 15000,
        stock: 30,
        images: [
          {
            url: "https://res.cloudinary.com/demo/image/upload/v1/labcoat.jpg",
            publicId: "labcoat_1",
          },
        ],
        createdBy: adminId,
      },
      {
        name: "Amoxicillin 500mg",
        description: "Broad-spectrum antibiotic for bacterial infections.",
        brand: "Medigen",
        category: categories[1]._id, // Antibiotics
        price: 5000,
        stock: 100,
        prescriptionRequired: true,
        images: [
          {
            url: "https://res.cloudinary.com/demo/image/upload/v1/amox.jpg",
            publicId: "amox_1",
          },
        ],
        createdBy: adminId,
      },
      {
        name: "Paracetamol 500mg",
        description: "Effective relief for headaches and fever.",
        brand: "Panadol",
        category: categories[2]._id, // Pain Relief
        price: 1000,
        stock: 500,
        images: [
          {
            url: "https://res.cloudinary.com/demo/image/upload/v1/para.jpg",
            publicId: "para_1",
          },
        ],
        createdBy: adminId,
      },
      {
        name: "Digital Thermometer",
        description: "Instant read digital thermometer with memory.",
        brand: "Omron",
        category: categories[4]._id, // Equipment
        price: 8500,
        stock: 25,
        images: [
          {
            url: "https://res.cloudinary.com/demo/image/upload/v1/therm.jpg",
            publicId: "therm_1",
          },
        ],
        createdBy: adminId,
      },
    ]);

    // 5. Seed Cart
    console.log("Seeding carts...");
    await Cart.create({
      user: customer._id,
      items: [
        { product: products[0]._id, qty: 1, price: products[0].price },
        { product: products[3]._id, qty: 2, price: products[3].price },
      ],
      discountTotal: 0,
    });

    // 6. Seed Orders
    console.log("Seeding orders...");
    const orderItems = [
      { product: products[0]._id, qty: 1, price: products[0].price },
      { product: products[1]._id, qty: 1, price: products[1].price },
    ];
    const subtotal = orderItems.reduce(
      (acc, item) => acc + item.price * item.qty,
      0,
    );
    const deliveryFee = 2000;

    const order = await Order.create({
      user: customer._id,
      items: orderItems,
      shippingAddress: {
        fullName: customer.name,
        street: customer.addresses[0].street,
        city: customer.addresses[0].city,
        state: customer.addresses[0].state,
        zip: customer.addresses[0].zipCode,
        country: customer.addresses[0].country,
      },
      paymentMethod: "paystack",
      paymentStatus: "paid",
      orderStatus: "processing",
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      total: subtotal + deliveryFee,
    });

    // 7. Seed Payment
    console.log("Seeding payments...");
    const payment = await Payment.create({
      user: customer._id,
      order: order._id,
      provider: "paystack",
      reference: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      amount: order.total,
      currency: "NGN",
      status: "success",
      paymentMethod: "card",
      paidAt: new Date(),
    });

    // Link payment back to order
    await Order.findByIdAndUpdate(order._id, {
      $addToSet: { payments: payment._id },
    });

    // 8. Seed Return
    console.log("Seeding returns...");
    await Return.create({
      user: customer._id,
      orderId: order._id,
      items: [{ product: products[0]._id, qty: 1 }],
      reason: "Slightly different shade of blue than expected",
      type: "Exchange",
      status: "Pending",
    });

    console.log("✅ Full meaningful seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedData();
