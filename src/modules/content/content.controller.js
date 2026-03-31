import asyncWrapper from "../../utils/asyncWrapper.js";
import AppError from "../../utils/AppError.js";
import { sendSuccess } from "../../utils/sendResponse.js";
import ContentBlock from "./contentBlock.model.js";

class ContentController {
  getContent = asyncWrapper(async (req, res, next) => {
    // Determine the key from the requesting route or query
    // Determine the key from the requesting route or query
    const type = req.params.key;
    const content = await ContentBlock.findOne({ type, isActive: true });

    if (!content) {
      return next(new AppError(`Content for ${type} not found`, 404));
    }

    return sendSuccess(res, content, "Content retrieved successfully");
  });

  updateContent = asyncWrapper(async (req, res, next) => {
    const type = req.params.key;
    const body = req.body;

    // Admin only updating the block
    let content = await ContentBlock.findOneAndUpdate(
      { type },
      { $set: body },
      { new: true, upsert: true, runValidators: true },
    );

    return sendSuccess(res, content, "Content updated successfully");
  });
}

export default new ContentController();
