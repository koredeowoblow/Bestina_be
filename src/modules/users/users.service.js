import User from "../auth/auth.model.js";
import AppError from "../../utils/AppError.js";
import uploadService from "../upload/upload.service.js";
import { assertValidCloudinaryUrl } from "../../utils/image-upload.util.js";

class UserService {
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);
    return user;
  }

  async updateProfile(userId, payload) {
    // Exclude restricted fields like password, role, isVerified
    const { name, email, phone, bio, dob, photoBuffer } = payload;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (bio) updateData.bio = bio;
    if (dob) updateData.dob = dob;

    if (photoBuffer) {
      const uploadedPhoto = await uploadService.uploadImage(photoBuffer);
      assertValidCloudinaryUrl(uploadedPhoto.url, "Profile photo URL");

      const user = await User.findById(userId);
      if (user && user.photo && user.photo.publicId) {
        // Delete old image from Cloudinary
        await uploadService.deleteImage(user.photo.publicId);
      }
      updateData.photo = uploadedPhoto;
    }

    return await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async getAddresses(userId) {
    const user = await User.findById(userId).select("addresses");
    if (!user) throw new AppError("User not found", 404);
    return user.addresses;
  }

  async addAddress(userId, payload) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (payload.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    } else if (user.addresses.length === 0) {
      payload.isDefault = true;
    }

    user.addresses.push(payload);
    await user.save();
    return user.addresses;
  }

  async deleteAddress(userId, addressId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const initialLength = user.addresses.length;
    user.addresses = user.addresses.filter(
      (addr) => addr._id.toString() !== addressId.toString(),
    );

    if (user.addresses.length === initialLength) {
      throw new AppError("Address not found", 404);
    }

    // if deleted was default, make the first one default (if exists)
    const hasDefault = user.addresses.some((addr) => addr.isDefault);
    if (!hasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    return user.addresses;
  }
}

export default new UserService();
