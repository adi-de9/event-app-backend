import * as userService from './user.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/appError.js';

export const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  if (!user) throw new AppError(404, 'User not found');

  res.status(200).json({
    success: true,
    data: user,
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateUserProfile(req.user.id, req.body);

  res.status(200).json({
    success: true,
    data: user,
  });
});
