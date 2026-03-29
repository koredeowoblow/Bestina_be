import { v2 as cloudinary } from "cloudinary";
import "../env.js";
import { logger } from "../utils/logger.js";

const sanitize = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
};

const cloudName = sanitize(process.env.CLOUDINARY_CLOUD_NAME);
const apiKey = sanitize(process.env.CLOUDINARY_API_KEY);
const apiSecret = sanitize(process.env.CLOUDINARY_API_SECRET);

const missing = [];
if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
if (!apiKey) missing.push("CLOUDINARY_API_KEY");
if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");

if (missing.length > 0) {
  throw new Error(
    `Cloudinary configuration error. Missing environment variables: ${missing.join(", ")}`,
  );
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

logger.info(`Cloudinary configured for cloud: ${cloudName}`);

export default cloudinary;
