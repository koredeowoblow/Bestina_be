import uploadService from './upload.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';

class UploadController {
  uploadImage = asyncWrapper(async (req, res, next) => {
    if (!req.file) {
      return next(new AppError('Please upload an image file', 400));
    }

    const result = await uploadService.uploadImage(req.file.buffer);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: result
    });
  });
}


export default new UploadController();
