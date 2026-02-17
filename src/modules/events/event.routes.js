import { Router } from 'express';
import * as eventController from './event.controller.js';
import { verifyJWT } from '../../middleware/auth.middleware.js';
import { allowRoles } from '../../middleware/role.middleware.js';

const router = Router();

// Public routes (Visitor)
router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);

// Admin only routes
router.use(verifyJWT);
router.use(allowRoles('admin'));

router.post('/', eventController.createEvent);
router.patch('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

export default router;
