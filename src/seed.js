import mongoose from "mongoose";
import dotenv from "dotenv";
import "./env.js";
import cloudinary from "./config/cloudinary.config.js";
import User from "./modules/auth/auth.model.js";
import Category from "./modules/categories/category.model.js";
import Product from "./modules/products/product.model.js";
import Order from "./modules/orders/order.model.js";
import Cart from "./modules/cart/cart.model.js";
import Payment from "./modules/payments/payment.model.js";
import Return from "./modules/returns/return.model.js";
import Review from "./modules/reviews/review.model.js";
import SiteSettings from "./modules/admin/siteSettings.model.js";
import ContentBlock from "./modules/content/contentBlock.model.js";
import ShippingZone from "./modules/shipping/shippingZone.model.js";
import Session from "./modules/auth/session.model.js";
import { connectMongoDB } from "./config/db.config.js";

const seedData = async () => {
  try {
    await connectMongoDB();

    // 1. Delete old product images from Cloudinary
    console.log("Cleaning up old product images from Cloudinary...");
    const existingProducts = await Product.find({}, { images: 1 });
    const publicIds = existingProducts
      .flatMap((p) => p.images || [])
      .map((img) => img.publicId)
      .filter((id) => id && !id.startsWith("product_")); // skip fake seed IDs

    if (publicIds.length > 0) {
      // Cloudinary supports deleting up to 100 resources at a time
      for (let i = 0; i < publicIds.length; i += 100) {
        const batch = publicIds.slice(i, i + 100);
        try {
          await cloudinary.api.delete_resources(batch);
          console.log(`  Deleted batch of ${batch.length} images from Cloudinary`);
        } catch (err) {
          console.warn(`  Warning: Failed to delete some images:`, err.message);
        }
      }
      console.log(`  Cleaned up ${publicIds.length} Cloudinary images total.`);
    } else {
      console.log("  No real Cloudinary images to clean up.");
    }

    // 2. Clear existing data
    console.log("Clearing existing data...");
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Cart.deleteMany({}),
      Payment.deleteMany({}),
      Return.deleteMany({}),
      Review.deleteMany({}),
      SiteSettings.deleteMany({}),
      ContentBlock.deleteMany({}),
      ShippingZone.deleteMany({}),
      Session.deleteMany({}),
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

    // 3. Seed Site Settings
    console.log("Seeding site settings...");
    await SiteSettings.create({
      siteName: "Bestina Medical Wear",
      contactEmail: "contact@bestina.com",
      supportPhone: "+234 800 BESTINA",
      freeShippingThresholdKobo: 5000000, // 50k Naira
    });

    // 4. Seed Content Blocks
    console.log("Seeding content blocks...");
    await ContentBlock.create([
      {
        type: "home",
        data: {
          hero: {
            title: "Premium Medical Wear",
            subtitle: "Excellence in every stitch",
          },
        },
      },
      {
        type: "footer",
        data: {
          about: "Bestina is Africa's leading provider of premium medical scrubs.",
          links: [
            { name: "About Us", url: "/about" },
            { name: "Contact", url: "/contact" },
          ],
        },
      },
      {
        type: "shipping-faqs",
        data: {
          questions: [
            { q: "How long is shipping?", a: "3-5 business days." },
            { q: "Do you ship worldwide?", a: "Yes, we do!" },
          ],
        },
      },
    ]);

    // 5. Seed Shipping Zones
    console.log("Seeding shipping zones...");
    await ShippingZone.create([
      {
        region: "Lagos Mainland",
        states: ["Lagos"],
        baseFeeKobo: 200000,
        minDays: 1,
        maxDays: 2,
      },
      {
        region: "South West",
        states: ["Oyo", "Ogun", "Osun", "Ekiti", "Ondo"],
        baseFeeKobo: 350000,
        minDays: 2,
        maxDays: 4,
      },
      {
        region: "Rest of Nigeria",
        baseFeeKobo: 500000,
        minDays: 3,
        maxDays: 7,
      },
    ]);

    // 6. Seed Categories
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

    // 7. Seed Products (100+ items)
    console.log("Seeding 100+ products...");

    // Category-specific image pools using actual Cloudinary sample images
    const cloud = "dy1h6tour";

    const categoryImages = {
      medicalWear: [
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/people/boy-snow-hoodie.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/people/jazz.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/people/smiling-man.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/woman-on-a-football-field.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/outdoor-woman.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/man-portrait.jpg`,
      ],

      antibiotics: [
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/food/spices.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/food/pot-mussels.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/food/fish-vegetables.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/food/dessert.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/breakfast.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/coffee.jpg`,
      ],

      painRelief: [
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/ecommerce/accessories-bag.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/ecommerce/leather-bag-gray.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/ecommerce/car-interior-design.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/ecommerce/analog-classic.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/shoe.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/ecommerce/shoes.png`,
      ],

      skincare: [
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/look-up.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/smile.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/two-ladies.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/man-on-a-street.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/man-on-a-escalator.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/dessert-on-a-plate.jpg`,
      ],

      equipment: [
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/chair.png`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/chair-and-coffee-table.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/cup-on-a-table.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/bike.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/balloons.jpg`,
        `https://res.cloudinary.com/${cloud}/image/upload/w_600,h_600,c_fill/samples/sheep.jpg`,
      ],
    };

    const imageKeys = ["medicalWear", "antibiotics", "painRelief", "skincare", "equipment"];

    const productTemplates = [
      {
        category: categories[0]._id, // Medical Wear
        imageKey: "medicalWear",
        brands: ["Bestina Wear", "Infinity", "Cherokee", "Figs"],
        items: [
          { name: "Premium Scrubs", desc: "Anti-microbial, breathable scrubs." },
          { name: "Professional Lab Coat", desc: "White cotton, multiple pockets." },
          { name: "Surgical Cap", desc: "Comfortable fit for long hours." },
          { name: "Compression Socks", desc: "Reduces fatigue during long shifts." },
          { name: "Stethoscope Case", desc: "Hard shell protection for gear." },
        ],
        priceRange: [15000, 45000],
      },
      {
        category: categories[1]._id, // Antibiotics
        imageKey: "antibiotics",
        brands: ["Medigen", "Pfizer", "GSK", "Novartis"],
        items: [
          { name: "Amoxicillin", desc: "Broad-spectrum antibiotic." },
          { name: "Ciprofloxacin", desc: "For bacterial infections." },
          { name: "Azithromycin", desc: "5-day dose pack." },
          { name: "Metronidazole", desc: "Effective against anaerobes." },
          { name: "Doxycycline", desc: "Broad usage antibiotic." },
        ],
        priceRange: [3000, 12000],
        requiresPrescription: true,
      },
      {
        category: categories[2]._id, // Pain Relief
        imageKey: "painRelief",
        brands: ["Panadol", "Advil", "Mortein", "Emzor"],
        items: [
          { name: "Paracetamol", desc: "Headache and fever relief." },
          { name: "Ibuprofen", desc: "Anti-inflammatory pain relief." },
          { name: "Diclofenac Gel", desc: "Topical pain relief for joints." },
          { name: "Aspirin", desc: "Low-dose heart health or pain." },
          { name: "Naproxen", desc: "Long-lasting pain relief." },
        ],
        priceRange: [500, 5000],
      },
      {
        category: categories[3]._id, // Skincare
        imageKey: "skincare",
        brands: ["CeraVe", "Neutrogena", "Cetaphil", "Bestina Care"],
        items: [
          { name: "Moisturizing Lotion", desc: "For sensitive skin." },
          { name: "Sunscreen SPF 50", desc: "High protection UVA/UVB." },
          { name: "Antiseptic Cream", desc: "First aid for minor cuts." },
          { name: "Vitamin C Serum", desc: "Brightening skin treatment." },
          { name: "Healing Ointment", desc: "Restores skin barrier." },
        ],
        priceRange: [4000, 25000],
      },
      {
        category: categories[4]._id, // Equipment
        imageKey: "equipment",
        brands: ["Omron", "Littmann", "Beurer", "Roche"],
        items: [
          { name: "Digital Thermometer", desc: "Instant read accuracy." },
          { name: "BP Monitor", desc: "Automatic wrist type." },
          { name: "Stethoscope", desc: "Professional grade acoustics." },
          { name: "Pulse Oximeter", desc: "SpO2 and pulse rate monitor." },
          { name: "Glucometer Kit", desc: "Includes strips and lancets." },
        ],
        priceRange: [8000, 150000],
      },
    ];

    const allProducts = [];
    const variations = ["Pro", "Elite", "Standard", "Premium", "Ultra", "Classic", "Advanced", "Essentials"];
    const colors = ["Navy Blue", "Royal Blue", "Hunter Green", "Charcoal Gray", "Burgundy", "Teal"];

    for (const template of productTemplates) {
      const images = categoryImages[template.imageKey];
      for (let i = 0; i < 25; i++) {
        const baseItem = template.items[i % template.items.length];
        const variation = variations[Math.floor(Math.random() * variations.length)];
        const brand = template.brands[Math.floor(Math.random() * template.brands.length)];
        const color = template.category.equals(categories[0]._id) ? ` - ${colors[i % colors.length]}` : "";

        const price = Math.floor(
          Math.random() * (template.priceRange[1] - template.priceRange[0]) + template.priceRange[0]
        );

        // Stock: some out of stock (10% chance), some low (1-10), some high (20-100)
        let stock;
        const stockRoll = Math.random();
        if (stockRoll < 0.1) {
          stock = 0;
        } else if (stockRoll < 0.3) {
          stock = Math.floor(Math.random() * 10) + 1;
        } else {
          stock = Math.floor(Math.random() * 80) + 20;
        }

        // Pick a varied image from the category pool
        const imageUrl = images[i % images.length];

        allProducts.push({
          name: `${variation} ${baseItem.name}${color}`,
          slug: `${variation.toLowerCase()}-${baseItem.name.toLowerCase().replace(/ /g, "-")}-${color.toLowerCase().replace(/ /g, "-")}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          description: `${baseItem.desc} Trusted by professionals worldwide. Part of our ${variation} collection.`,
          brand: brand,
          category: template.category,
          price: price,
          stock: stock,
          prescriptionRequired: template.requiresPrescription || false,
          images: [
            {
              url: imageUrl,
              publicId: `product_${template.imageKey}_${i}`,
            },
          ],
          createdBy: adminId,
        });
      }
    }

    const products = await Product.insertMany(allProducts);
    console.log(`Created ${products.length} products successfully.`);

    // 8. Seed Reviews
    console.log("Seeding reviews...");
    await Review.create([
      {
        product: products[0]._id, // Medical Wear
        user: customer._id,
        userName: customer.name,
        rating: 5,
        comment: "Excellent quality scrubs!",
        verifiedPurchase: true,
      },
      {
        product: products[100]._id, // Equipment
        user: customer._id,
        userName: customer.name,
        rating: 4,
        comment: "Very accurate thermometer.",
        verifiedPurchase: true,
      },
    ]);

    // 9. Seed Cart
    console.log("Seeding carts...");
    await Cart.create({
      user: customer._id,
      items: [
        { product: products[0]._id, qty: 1, price: products[0].price },
        { product: products[50]._id, qty: 2, price: products[50].price }, // Pain Relief
      ],
      discountTotal: 0,
    });

    // 10. Seed Orders
    console.log("Seeding orders...");
    const orderItems = [
      { product: products[25]._id, qty: 1, price: products[25].price }, // Antibiotics
      { product: products[75]._id, qty: 1, price: products[75].price }, // Skincare
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

    // 11. Seed Payment
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

    // 12. Seed Return
    console.log("Seeding returns...");
    await Return.create({
      user: customer._id,
      orderId: order._id,
      items: [{ product: products[25]._id, qty: 1 }],
      reason: "Ordered the wrong strength of medication",
      type: "Refund",
      status: "Pending",
    });

    console.log("✅ Full comprehensive seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedData();
