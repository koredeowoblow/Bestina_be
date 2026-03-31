import { imageUploadService } from "../../container.js";
import asyncWrapper from "../../utils/asyncWrapper.js";
import AppError from "../../utils/AppError.js";
import { sendSuccess } from "../../utils/sendResponse.js";

class UploadController {
  uploadImage = asyncWrapper(async (req, res, next) => {
    if (!req.file || !req.file.buffer) {
      return next(new AppError("Please upload an image file", 400));
    }

    const customFolder = req.body?.folder || req.query?.folder || undefined;
    const uploadResult = await imageUploadService.uploadImage(
      req.file.buffer,
      customFolder,
    );
    return sendSuccess(res, uploadResult, "Image uploaded successfully");
  });

  uploadImages = asyncWrapper(async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return next(new AppError("Please upload at least one image file", 400));
    }

    const customFolder = req.body?.folder || req.query?.folder || undefined;
    const uploadPromises = req.files.map((file) =>
      imageUploadService.uploadImage(file.buffer, customFolder),
    );

    const uploadResults = await Promise.all(uploadPromises);
    return sendSuccess(res, uploadResults, "Images uploaded successfully");
  });

  deleteImage = asyncWrapper(async (req, res, next) => {
    const { publicId } = req.params;
    if (!publicId) {
      return next(new AppError("Public ID is required", 400));
    }

    await imageUploadService.deleteImage(publicId);
    return sendSuccess(res, null, "Image deleted successfully", 204);
  });
}

export default new UploadController();
