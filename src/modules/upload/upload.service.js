import cloudinary from 'cloudinary';
import config from '../../config/index.js';
import AppError from '../../utils/AppError.js';
import stream from 'stream';



// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret
});

class UploadService {
  uploadImage(buffer) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'bestina' },
        (error, result) => {
          if (error) {
            return reject(new AppError('Image upload failed', 500));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id
          });
        }
      );

      const pass = new stream.PassThrough();
      pass.end(buffer);
      pass.pipe(uploadStream);
    });
  }
}

export default new UploadService();
