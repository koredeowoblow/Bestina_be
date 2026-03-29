import cloudinary from "../config/cloudinary.config.js";
import AppError from "./AppError.js";

const CLOUDINARY_URL_PREFIX = "https://res.cloudinary.com";

export const isValidCloudinaryUrl = (url) =>
  typeof url === "string" && url.startsWith(CLOUDINARY_URL_PREFIX);

export const assertValidCloudinaryUrl = (url, field = "image URL") => {
  if (!isValidCloudinaryUrl(url)) {
    throw new AppError(
      `${field} must be a valid Cloudinary secure URL starting with ${CLOUDINARY_URL_PREFIX}`,
      400,
    );
  }
};

const assertCloudinaryIsConfigured = () => {
  const cfg = cloudinary.config();
  if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) {
    throw new AppError(
      "Cloudinary is not fully configured. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      500,
    );
  }
};

const toUploadError = (error) => {
  const cloudinaryMessage = error?.message || "Unknown Cloudinary upload error";
  const code = Number(error?.http_code) || Number(error?.statusCode) || 500;
  const responsePayload =
    error?.response?.body || error?.response || error?.error || error || {};
  let responseDetails = "";

  try {
    responseDetails = JSON.stringify(responsePayload);
  } catch {
    responseDetails = String(responsePayload);
  }

  if (code === 403) {
    const hasDetailedBody =
      responseDetails &&
      responseDetails !== "{}" &&
      responseDetails !== "undefined";
    const authHint = hasDetailedBody
      ? ""
      : " This usually means the API key is restricted/read-only for Upload API, or the Cloudinary product environment/account is blocking uploads.";

    return new AppError(
      `Cloudinary authentication failed — check CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, and CLOUDINARY_CLOUD_NAME.${authHint} Details: ${responseDetails}`,
      403,
    );
  }

  if (code >= 400 && code < 500) {
    return new AppError(
      `Image upload failed: ${cloudinaryMessage}. Cloudinary response: ${responseDetails}`,
      400,
    );
  }

  return new AppError(
    `Image upload failed due to Cloudinary service error: ${cloudinaryMessage}. Cloudinary response: ${responseDetails}`,
    500,
  );
};

export const uploadToCloudinary = (buffer, folder = "bestina") => {
  assertCloudinaryIsConfigured();

  if (!Buffer.isBuffer(buffer)) {
    throw new AppError("Invalid image file buffer", 400);
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error) {
          return reject(toUploadError(error));
        }

        if (!result) {
          return reject(
            new AppError("Image upload failed: empty response", 500),
          );
        }

        try {
          assertValidCloudinaryUrl(result.secure_url, "Uploaded image URL");
        } catch (validationError) {
          return reject(validationError);
        }

        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    uploadStream.end(buffer);
  });
};

export const parseExistingImagesInput = (existingImagesRaw) => {
  if (existingImagesRaw === undefined || existingImagesRaw === null) {
    return [];
  }

  let urls = [];

  if (Array.isArray(existingImagesRaw)) {
    urls = existingImagesRaw;
  } else if (typeof existingImagesRaw === "string") {
    const trimmed = existingImagesRaw.trim();

    if (!trimmed) {
      urls = [];
    } else if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          throw new AppError("existingImages must be an array of URLs", 400);
        }
        urls = parsed;
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(
          "existingImages must be a valid JSON array of Cloudinary URLs",
          400,
        );
      }
    } else {
      urls = [trimmed];
    }
  } else {
    throw new AppError("existingImages must be an array of URLs", 400);
  }

  return urls.map((url, index) => {
    if (typeof url !== "string") {
      throw new AppError(
        `existingImages[${index}] must be a Cloudinary URL string`,
        400,
      );
    }

    const normalized = url.trim();
    assertValidCloudinaryUrl(normalized, `existingImages[${index}]`);
    return normalized;
  });
};

export const assertCloudinaryImageRecords = (images, field = "images") => {
  if (!Array.isArray(images)) {
    throw new AppError(`${field} must be an array`, 400);
  }

  images.forEach((image, index) => {
    if (!image || typeof image !== "object") {
      throw new AppError(`${field}[${index}] must be an object`, 400);
    }
    if (typeof image.publicId !== "string" || !image.publicId.trim()) {
      throw new AppError(`${field}[${index}].publicId is required`, 400);
    }
    assertValidCloudinaryUrl(image.url, `${field}[${index}].url`);
  });
};
