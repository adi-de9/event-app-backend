import { AppError } from '../utils/appError.js';

export const allowRoles = (...roles) => {
  return (req, _, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(403, 'You are not allowed to access this resource')
      );
    }
    next();
  };
};
