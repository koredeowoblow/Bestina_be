import adminService from './admin.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

class AdminController {
  getStats = asyncWrapper(async (req, res, next) => {
    const timeframe = req.query.timeframe || 'today';
    const stats = await adminService.getDashboardStats(timeframe);
    res.status(200).json({
      success: true,
      message: 'Dashboard stats fetched',
      data: stats
    });
  });

  getUsers = asyncWrapper(async (req, res, next) => {
    const result = await adminService.getAllUsers(req.query);
    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: result.users,
      meta: {
        totalDocs: result.total,
        page: result.page,
        limit: result.limit
      }
    });
  });

  suspendUser = asyncWrapper(async (req, res, next) => {
    // Pass true to suspend, false to unsuspend
    const state = req.body.suspend === true;
    await adminService.suspendUser(req.params.id, state);
    res.status(200).json({
      success: true,
      message: state ? 'User suspended' : 'User reinstated',
      data: null
    });
  });

  updateSettings = asyncWrapper(async (req, res, next) => {
    // Dummy logic for global settings
    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: req.body
    });
  });
}

export default new AdminController();
