import returnService from "./return.service.js";
import asyncWrapper from "../../utils/asyncWrapper.js";
import { sendSuccess } from "../../utils/sendResponse.js";

class ReturnController {
  createReturn = asyncWrapper(async (req, res, next) => {
    const createdReturnRequest = await returnService.createRequest(
      req.user.id,
      req.body,
    );
    return sendSuccess(
      res,
      createdReturnRequest,
      "Return request submitted successfully",
      201,
    );
  });

  getMyReturns = asyncWrapper(async (req, res, next) => {
    const userReturns = await returnService.getUserRequests(req.user.id);
    return sendSuccess(res, userReturns, "User returns fetched");
  });

  getAdminReturns = asyncWrapper(async (req, res, next) => {
    const adminReturnsResult = await returnService.getAdminRequests(req.query);
    const returnsMeta = {
      totalDocs: adminReturnsResult.totalDocs,
      page: adminReturnsResult.page,
      limit: adminReturnsResult.limit,
    };

    return sendSuccess(
      res,
      adminReturnsResult.docs,
      "All returns fetched",
      200,
      returnsMeta,
    );
  });

  processReturn = asyncWrapper(async (req, res, next) => {
    const { action, notes } = req.body;
    const processedReturn = await returnService.processReturn(
      req.params.id,
      action,
      notes,
    );
    return sendSuccess(
      res,
      processedReturn,
      `Return ${action.toLowerCase()}d successfully`,
    );
  });
}

export default new ReturnController();
