import asyncWrapper from "../../utils/asyncWrapper.js";
import { sendSuccess } from "../../utils/sendResponse.js";

class UsersController {
  constructor({ usersService }) {
    if (!usersService) {
      throw new Error("UsersController requires usersService");
    }

    this.usersService = usersService;
    this.getProfile = asyncWrapper(this.getProfile.bind(this));
    this.updateProfile = asyncWrapper(this.updateProfile.bind(this));
    this.getAddresses = asyncWrapper(this.getAddresses.bind(this));
    this.addAddress = asyncWrapper(this.addAddress.bind(this));
    this.updateAddress = asyncWrapper(this.updateAddress.bind(this));
    this.deleteAddress = asyncWrapper(this.deleteAddress.bind(this));
    this.updatePreferences = asyncWrapper(this.updatePreferences.bind(this));
    this.updateAvatar = asyncWrapper(this.updateAvatar.bind(this));
  }

  async getProfile(req, res, next) {
    const userProfile = await this.usersService.getProfile(req.user.id);
    return sendSuccess(res, userProfile, "Profile fetched successfully");
  }

  async updateProfile(req, res, next) {
    const updatedUserProfile = await this.usersService.updateProfile(
      req.user.id,
      req.body,
    );
    return sendSuccess(res, updatedUserProfile, "Profile updated successfully");
  }

  async getAddresses(req, res, next) {
    const addresses = await this.usersService.getAddresses(req.user.id);
    return sendSuccess(res, addresses, "Addresses fetched successfully");
  }

  async addAddress(req, res, next) {
    const addresses = await this.usersService.addAddress(req.user.id, req.body);
    return sendSuccess(res, addresses, "Address added successfully", 201);
  }

  async deleteAddress(req, res, next) {
    const addresses = await this.usersService.deleteAddress(
      req.user.id,
      req.params.id,
    );
    return sendSuccess(res, addresses, "Address removed successfully");
  }

  async updateAddress(req, res, next) {
    const address = await this.usersService.updateAddress(
      req.user.id,
      req.params.id,
      req.body,
    );
    return sendSuccess(res, address, "Address updated successfully");
  }

  async updatePreferences(req, res, next) {
    const preferences = await this.usersService.updatePreferences(
      req.user.id,
      req.body,
    );
    return sendSuccess(
      res,
      { preferences },
      "Preferences updated successfully",
    );
  }

  async updateAvatar(req, res, next) {
    const result = await this.usersService.updateAvatar(
      req.user.id,
      req.body.photoBuffer,
    );
    return sendSuccess(res, result, "Avatar updated successfully");
  }
}

export default UsersController;
