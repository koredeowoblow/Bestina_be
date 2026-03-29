import returnService from './return.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

class ReturnController {
  createReturn = asyncWrapper(async (req, res, next) => {
    const result = await returnService.createRequest(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Return request submitted successfully',
      data: result
    });
  });

  getMyReturns = asyncWrapper(async (req, res, next) => {
    const result = await returnService.getUserRequests(req.user.id);
    res.status(200).json({
      success: true,
      message: 'User returns fetched',
      data: result
    });
  });

  getAdminReturns = asyncWrapper(async (req, res, next) => {
    const result = await returnService.getAdminRequests(req.query);
    res.status(200).json({
      success: true,
      message: 'All returns fetched',
      data: result.docs,
      meta: {
        totalDocs: result.totalDocs,
        page: result.page,
        limit: result.limit
      }
    });
  });

  processReturn = asyncWrapper(async (req, res, next) => {
    const { action, notes } = req.body;
    const result = await returnService.processReturn(req.params.id, action, notes);
    res.status(200).json({
      success: true,
      message: `Return ${action.toLowerCase()}d successfully`,
      data: result
    });
  });
}


export default new ReturnController();
