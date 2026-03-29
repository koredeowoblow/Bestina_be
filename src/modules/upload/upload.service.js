import AppError from "../../utils/AppError.js";
import cloudinary from "../../config/cloudinary.config.js";
import {
  assertCloudinaryImageRecords,
  uploadToCloudinary,
} from "../../utils/image-upload.util.js";

class UploadService {
  /**
   * Uploads a single image buffer to Cloudinary
   * @param {Buffer} buffer - The image file buffer from multer
   * @returns {Promise<{url: string, publicId: string}>}
   */
  uploadImage(buffer) {
    return uploadToCloudinary(buffer, "bestina");
  }

  /**
   * Uploads multiple image buffers to Cloudinary
   * @param {Buffer[]} buffers - Array of image file buffers from multer
   * @returns {Promise<{url: string, publicId: string}[]>}
   */
  async uploadImages(buffers) {
    if (!Array.isArray(buffers) || buffers.length === 0) return [];
    try {
      const uploadPromises = buffers.map((buf) => this.uploadImage(buf));
      const uploaded = await Promise.all(uploadPromises);
      assertCloudinaryImageRecords(uploaded);
      return uploaded;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Multiple image upload failed", 500);
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
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      // Log error but don't block process if image deletion fails
      // console.error(
      //   `Cloudinary deletion failed for ${publicId}:`,
      //   error.message,
      // );
      return new AppError(error.message, 500);
    }
  }
}

export default new UploadService();
