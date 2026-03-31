import AppError from "../../utils/AppError.js";
import { assertValidCloudinaryUrl } from "../../utils/image-upload.util.js";

class UsersService {
  constructor({
    usersRepository,
    imageUploadService,
    appErrorClass = AppError,
  }) {
    if (!usersRepository) {
      throw new Error("UsersService requires usersRepository");
    }
    if (!imageUploadService) {
      throw new Error("UsersService requires imageUploadService");
    }

    this.usersRepository = usersRepository;
    this.imageUploadService = imageUploadService;
    this.AppError = appErrorClass;
  }

  async getProfile(userId) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new this.AppError("User not found", 404);
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
      const uploadedPhoto =
        await this.imageUploadService.uploadImage(photoBuffer);
      assertValidCloudinaryUrl(uploadedPhoto.url, "Profile photo URL");

      const user = await this.usersRepository.findById(userId);
      if (user && user.photo && user.photo.publicId) {
        await this.imageUploadService.deleteImage(user.photo.publicId);
      }
      updateData.photo = uploadedPhoto;
    }

    return this.usersRepository.updateById(userId, updateData);
  }

  async getAddresses(userId) {
    const user = await this.usersRepository.findByIdWithAddresses(userId);
    if (!user) throw new this.AppError("User not found", 404);
    return user.addresses;
  }

  async addAddress(userId, payload) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new this.AppError("User not found", 404);

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
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new this.AppError("User not found", 404);

    const initialLength = user.addresses.length;
    user.addresses = user.addresses.filter(
      (addr) => addr._id.toString() !== addressId.toString(),
    );

    if (user.addresses.length === initialLength) {
      throw new this.AppError("Address not found", 404);
    }

    // if deleted was default, make the first one default (if exists)
    const hasDefault = user.addresses.some((addr) => addr.isDefault);
    if (!hasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    return user.addresses;
  }

  async updateAddress(userId, addressId, payload) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new this.AppError("User not found", 404);

    const address = user.addresses.id(addressId);
    if (!address) throw new this.AppError("Address not found", 404);

    if (payload.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    Object.assign(address, payload);
    await user.save();
    return address;
  }

  async updatePreferences(userId, payload) {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new this.AppError("User not found", 404);

    user.preferences = {
      ...user.preferences,
      ...payload,
    };
    await user.save();
    return user.preferences;
  }

  async updateAvatar(userId, photoBuffer) {
    if (!photoBuffer) throw new this.AppError("Image buffer is required", 400);

    const uploadedPhoto =
      await this.imageUploadService.uploadImage(photoBuffer); // Might want 'avatars' folder
    assertValidCloudinaryUrl(uploadedPhoto.url, "Profile photo URL");

    const user = await this.usersRepository.findById(userId);
    if (!user) throw new this.AppError("User not found", 404);

    if (user.photo && user.photo.publicId) {
      await this.imageUploadService.deleteImage(user.photo.publicId);
    }

    user.photo = uploadedPhoto;
    await user.save();

    return {
      avatar: { url: uploadedPhoto.url, publicId: uploadedPhoto.publicId },
      userId: user._id,
    };
  }
}

export default UsersService;
