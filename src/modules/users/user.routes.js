import { Router } from 'express';
import * as userController from './user.controller.js';
import { verifyJWT } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(verifyJWT);

router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);

export default router;
