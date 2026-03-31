import AuthService from "./auth.service.js";
import asyncWrapper from "../../utils/asyncWrapper.js";
import AppError from "../../utils/AppError.js";
import { sendSuccess } from "../../utils/sendResponse.js";

class AuthController {
  register = asyncWrapper(async (req, res, next) => {
    await AuthService.register(req.body, req, res);
  });

  login = asyncWrapper(async (req, res, next) => {
    const { email, password } = req.body;
    await AuthService.login(email, password, req, res);
  });

  logout = asyncWrapper(async (req, res, next) => {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return sendSuccess(res, null, "Already logged out");
    }

    await AuthService.logout(token, res);
  });

  refresh = asyncWrapper(async (req, res, next) => {
    const refreshToken = req.cookies?.jwt_refresh || req.body?.refreshToken;
    if (!refreshToken)
      return next(new AppError("No refresh token provided", 401));
    await AuthService.refresh(refreshToken, req, res);
  });

  getMe = asyncWrapper(async (req, res, next) => {
    await AuthService.getMe(req.user.id, res);
  });

  forgotPassword = asyncWrapper(async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
      return next(new AppError("Please provide an email address", 400));
    }
    await AuthService.forgotPassword(email, res);
  });

  resetPassword = asyncWrapper(async (req, res, next) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return next(new AppError("Please provide token and new password", 400));
    }
    await AuthService.resetPassword(token, newPassword, res);
  });
}

export default new AuthController();
