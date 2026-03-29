import userService from './users.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

class UsersController {
  getProfile = asyncWrapper(async (req, res, next) => {
    const user = await userService.getProfile(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Profile fetched successfully',
      data: user
    });
  });

  updateProfile = asyncWrapper(async (req, res, next) => {
    const user = await userService.updateProfile(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  });

  getAddresses = asyncWrapper(async (req, res, next) => {
    const addresses = await userService.getAddresses(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Addresses fetched successfully',
      data: addresses
    });
  });

  addAddress = asyncWrapper(async (req, res, next) => {
    const addresses = await userService.addAddress(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: addresses
    });
  });

  deleteAddress = asyncWrapper(async (req, res, next) => {
    const addresses = await userService.deleteAddress(req.user.id, req.params.id);
    res.status(200).json({
      success: true,
      message: 'Address removed successfully',
      data: addresses
    });
  });
}


export default new UsersController();
