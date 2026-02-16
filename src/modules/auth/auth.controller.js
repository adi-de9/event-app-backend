import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import * as authService from './auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const user = await authService.registerUser({ name, email, password, role });

  // Don't send password back
  delete user.password;

  return res
    .status(201)
    .json(new ApiResponse(201, user, 'User registered successfully'));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken } = await authService.loginUser({
    email,
    password,
  });

  const options = {
    httpOnly: true,
    secure: true, // Should be true in production, can use process.env.NODE_ENV === 'production'
  };

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .json(
      new ApiResponse(200, { user, accessToken }, 'User logged in successfully')
    );
});
