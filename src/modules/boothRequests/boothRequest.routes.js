import { Router } from 'express';
import * as boothRequestController from './boothRequest.controller.js';
import { verifyJWT } from '../../middleware/auth.middleware.js';
import { allowRoles } from '../../middleware/role.middleware.js';

const router = Router();

router.use(verifyJWT);

// Exhibitor: Request a booth
router.post(
  '/',
  allowRoles('exhibitor'),
  boothRequestController.createBoothRequest
);

router.get(
  '/my',
  allowRoles('exhibitor'),
  boothRequestController.getMyBoothRequests
);

router.get(
  '/my-requests',
  allowRoles('exhibitor'),
  boothRequestController.getMyBoothRequests
);

router.get(
  '/my-booths',
  allowRoles('exhibitor'),
  boothRequestController.getMyAssignedBooths
);

// Admin: View all and manage
router.get(
  '/',
  allowRoles('admin'),
  boothRequestController.getAllBoothRequests
);
router.patch(
  '/:id/approve',
  allowRoles('admin'),
  boothRequestController.approveBoothRequest
);
router.patch(
  '/:id/reject',
  allowRoles('admin'),
  boothRequestController.rejectBoothRequest
);

export default router;
