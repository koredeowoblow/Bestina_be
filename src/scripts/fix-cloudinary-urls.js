import mongoose from "mongoose";
import "../env.js";
import { connectMongoDB } from "../config/db.config.js";
import Product from "../modules/products/product.model.js";
import User from "../modules/auth/auth.model.js";

const BROKEN_DEMO_URL_PREFIX =
  "https://res.cloudinary.com/demo/image/upload/v1/";
const BROKEN_DEFAULT_AVATAR =
  "https://res.cloudinary.com/default/image/upload/v1/avatar.png";
const FALLBACK_AVATAR =
  "https://res.cloudinary.com/demo/image/upload/sample.jpg";

const demoImageReplacements = {
  "scrubs.jpg":
    "https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_900/sample",
  "labcoat.jpg":
    "https://res.cloudinary.com/demo/image/upload/e_grayscale/c_fill,w_1200,h_900/sample",
  "amox.jpg":
    "https://res.cloudinary.com/demo/image/upload/e_saturation:50/c_fill,w_1200,h_900/sample",
  "para.jpg":
    "https://res.cloudinary.com/demo/image/upload/e_contrast:40/c_fill,w_1200,h_900/sample",
  "therm.jpg":
    "https://res.cloudinary.com/demo/image/upload/e_sharpen:100/c_fill,w_1200,h_900/sample",
};

const normalizeProductImageUrl = (url) => {
  if (typeof url !== "string") return url;
  if (!url.startsWith(BROKEN_DEMO_URL_PREFIX)) return url;

  const fileName = url.slice(BROKEN_DEMO_URL_PREFIX.length);
  return demoImageReplacements[fileName] || FALLBACK_AVATAR;
};

const run = async () => {
  await connectMongoDB();

  let updatedProducts = 0;
  let updatedProductImages = 0;

  const products = await Product.find({
    "images.url": { $regex: "/image/upload/v1/" },
  });
  for (const product of products) {
    let changed = false;

    product.images = (product.images || []).map((img) => {
      const newUrl = normalizeProductImageUrl(img?.url);
      if (newUrl !== img?.url) {
        changed = true;
        updatedProductImages += 1;
        return {
          ...img.toObject(),
          url: newUrl,
        };
      }
      return img;
    });

    if (changed) {
      await product.save();
      updatedProducts += 1;
    }
  }

  const userUpdateResult = await User.updateMany(
    { "photo.url": BROKEN_DEFAULT_AVATAR },
    { $set: { "photo.url": FALLBACK_AVATAR } },
  );

  const updatedUsers = userUpdateResult.modifiedCount || 0;

  console.log("Cloudinary URL fix migration complete.");
  console.log(`Products updated: ${updatedProducts}`);
  console.log(`Product image URLs updated: ${updatedProductImages}`);
  console.log(`Users updated: ${updatedUsers}`);
};

run()
  .catch((error) => {
    console.error("Cloudinary URL fix migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch {
      // no-op
    }
  });
