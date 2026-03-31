import AppError from "../../utils/AppError.js";
import {
  assertValidCloudinaryUrl,
  assertCloudinaryImageRecords,
} from "../../utils/image-upload.util.js";

class UploadService {
  constructor({ cloudinary, folder = "bestina", appErrorClass = AppError }) {
    if (!cloudinary) {
      throw new Error("UploadService requires cloudinary");
    }

    this.cloudinary = cloudinary;
    this.folder = folder;
    this.AppError = appErrorClass;
  }

  /**
   * Uploads a single image buffer to Cloudinary
   * @param {Buffer} buffer - The image file buffer from multer
   * @param {string} [customFolder] - Optional custom folder for the upload
   * @returns {Promise<{url: string, publicId: string}>}
   */
  uploadImage(buffer, customFolder) {
    if (!Buffer.isBuffer(buffer)) {
      throw new this.AppError("Invalid image file buffer", 400);
    }

    const folderName = customFolder || this.folder;

    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { folder: folderName, resource_type: "auto" },
        (error, result) => {
          if (error) {
            return reject(
              new this.AppError(error.message || "Image upload failed", 500),
            );
          }

          if (!result) {
            return reject(
              new this.AppError("Image upload failed: empty response", 500),
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
  }

  /**
   * Uploads multiple image buffers to Cloudinary
   * @param {Buffer[]} buffers - Array of image file buffers from multer
   * @returns {Promise<{url: string, publicId: string}[]>}
   */
  async uploadImages(buffers) {
    if (!Array.isArray(buffers) || buffers.length === 0) return [];
    try {
      const uploadPromises = buffers.map((buffer) => this.uploadImage(buffer));
      const uploaded = await Promise.all(uploadPromises);
      assertCloudinaryImageRecords(uploaded);
      return uploaded;
    } catch (error) {
      if (error instanceof this.AppError) throw error;
      throw new this.AppError("Multiple image upload failed", 500);
    }
  }

  /**
   * Deletes an image from Cloudinary
   * @param {string} publicId - The public ID of the image to delete
   * @returns {Promise<any>}
   */
  async deleteImage(publicId) {
    try {
      if (!publicId) return null;
      const result = await this.cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      return new this.AppError(error.message, 500);
    }
  }
}

export default UploadService;
