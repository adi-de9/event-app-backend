import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { query } from '../config/db.js';

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new AppError(401, 'Unauthorized request');
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [decodedToken.id]
    );
    const user = rows[0];

    if (!user) {
      throw new AppError(401, 'Invalid Access Token');
    }

    req.user = user;
    next();
  } catch (error) {
    throw new AppError(401, error?.message || 'Invalid access token');
  }
});
