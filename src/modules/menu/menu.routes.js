import { Router } from 'express';
import * as menuController from './menu.controller.js';
import { verifyJWT } from '../../middleware/auth.middleware.js';
import { allowRoles } from '../../middleware/role.middleware.js';

const router = Router();

// Public: View menu for a booth
router.get('/:boothId', menuController.getMenuByBoothId);

// Exhibitor only: Manage menu
router.use(verifyJWT);
router.use(allowRoles('exhibitor'));

router.post('/', menuController.createMenuItem);
router.patch('/:id', menuController.updateMenuItem);
router.delete('/:id', menuController.deleteMenuItem);

export default router;
