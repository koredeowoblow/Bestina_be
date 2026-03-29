import uploadService from "./upload.service.js";
import asyncWrapper from "../../utils/asyncWrapper.js";
import AppError from "../../utils/AppError.js";

class UploadController {
  uploadImage = asyncWrapper(async (req, res, next) => {
    if (!req.file || !req.file.buffer) {
      return next(new AppError("Please upload an image file", 400));
    }

    const result = await uploadService.uploadImage(req.file.buffer);

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: result,
    });
  });

  deleteImage = asyncWrapper(async (req, res, next) => {
    const { publicId } = req.params;
    if (!publicId) {
      return next(new AppError("Public ID is required", 400));
    }

    await uploadService.deleteImage(publicId);

    res.status(204).json({
      success: true,
      data: null,
    });
  });
}

export default new UploadController();
