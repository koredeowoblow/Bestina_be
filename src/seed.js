import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './env.js';
import User from './modules/auth/auth.model.js';
import Category from './modules/categories/category.model.js';
import Product from './modules/products/product.model.js';
import { connectMongoDB } from './config/db.config.js';

const seedData = async () => {
  try {
    await connectMongoDB();

    // 1. Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({})
    ]);

    // 2. Seed Users
    console.log('Seeding users...');
    const users = await User.create([
      {
        name: 'Super Admin',
        email: 'superadmin@bestina.com',
        password: 'Password123!',
        role: 'super_admin',
        isVerified: true
      },
      {
        name: 'Admin User',
        email: 'admin@bestina.com',
        password: 'Password123!',
        role: 'admin',
        isVerified: true
      },
      {
        name: 'Sample Customer',
        email: 'customer@example.com',
        password: 'Password123!',
        role: 'user',
        isVerified: true,
        addresses: [
          {
            street: '123 Health St',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria',
            zipCode: '100001',
            isDefault: true
          }
        ]
      }
    ]);

    const adminId = users[1]._id;

    // 3. Seed Categories
    console.log('Seeding categories...');
    const categories = await Category.create([
      { name: 'Medical Wear', slug: 'medical-wear', description: 'Professional scrubs and lab coats' },
      { name: 'Antibiotics', slug: 'antibiotics', description: 'Prescription bacterial infection treatments' },
      { name: 'Pain Relief', slug: 'pain-relief', description: 'Over-the-counter and prescription analgesics' },
      { name: 'Skincare', slug: 'skincare', description: 'Dermatological and therapeutic skincare' },
      { name: 'Equipment', slug: 'equipment', description: 'Diagnostic and monitoring tools' }
    ]);

    // 4. Seed Products
    console.log('Seeding products...');
    await Product.create([
      {
        name: 'Premium Blue Scrubs',
        description: 'Anti-microbial, breatheable blue scrubs for surgeons.',
        brand: 'Bestina Wear',
        category: categories[0]._id, // Medical Wear
        price: 25000,
        stock: 50,
        images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1/scrubs.jpg', publicId: 'scrubs_1' }],
        createdBy: adminId
      },
      {
        name: 'Standard Lab Coat',
        description: 'White cotton lab coat, knee length, multiple pockets.',
        brand: 'Bestina Wear',
        category: categories[0]._id, // Medical Wear
        price: 15000,
        stock: 30,
        images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1/labcoat.jpg', publicId: 'labcoat_1' }],
        createdBy: adminId
      },
      {
        name: 'Amoxicillin 500mg',
        description: 'Broad-spectrum antibiotic for bacterial infections.',
        brand: 'Medigen',
        category: categories[1]._id, // Antibiotics
        price: 5000,
        stock: 100,
        prescriptionRequired: true,
        images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1/amox.jpg', publicId: 'amox_1' }],
        createdBy: adminId
      },
      {
        name: 'Paracetamol 500mg',
        description: 'Effective relief for headaches and fever.',
        brand: 'Panadol',
        category: categories[2]._id, // Pain Relief
        price: 1000,
        stock: 500,
        images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1/para.jpg', publicId: 'para_1' }],
        createdBy: adminId
      },
      {
        name: 'Digital Thermometer',
        description: 'Instant read digital thermometer with memory.',
        brand: 'Omron',
        category: categories[4]._id, // Equipment
        price: 8500,
        stock: 25,
        images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1/therm.jpg', publicId: 'therm_1' }],
        createdBy: adminId
      }
    ]);

    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
