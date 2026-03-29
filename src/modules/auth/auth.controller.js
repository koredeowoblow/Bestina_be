import AuthService from './auth.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

class AuthController {
  register = asyncWrapper(async (req, res, next) => {
    await AuthService.register(req.body, res);
  });

  login = asyncWrapper(async (req, res, next) => {
    const { email, password } = req.body;
    await AuthService.login(email, password, res);
  });

  logout = asyncWrapper(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(200).json({ success: true, message: 'Already logged out', data: null });
    }

    await AuthService.logout(token, res);
  });

  refresh = asyncWrapper(async (req, res, next) => {
    const { refreshToken } = req.body;
    await AuthService.refresh(refreshToken, res);
  });

  getMe = asyncWrapper(async (req, res, next) => {
    await AuthService.getMe(req.user.id, res);
  });
}


export default new AuthController();
