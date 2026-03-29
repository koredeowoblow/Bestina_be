import "../env.js";

const REQUIRED_ENV_VARS = [
  "MONGODB_URI",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const sanitize = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
};

export const validateRequiredEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((name) => !sanitize(process.env[name]));

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
};
