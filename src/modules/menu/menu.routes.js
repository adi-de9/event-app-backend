import { Router } from 'express';
import * as menuController from './menu.controller.js';
import { verifyJWT } from '../../middleware/auth.middleware.js';
import { allowRoles } from '../../middleware/role.middleware.js';
import { upload } from '../../middleware/multer.middleware.js';

const router = Router();

// ─── Public
// GET /api/menu/booth/:boothId  → public menu view
router.get('/booth/:boothId', menuController.getMenuByBoothId);

// ─── Exhibitor only ──────────────────────────────────────────────────────────
router.use(verifyJWT);
router.use(allowRoles('exhibitor'));

// GET /api/menu/my → all items across exhibitor's booths
router.get('/my', menuController.getMyMenu);

// POST /api/menu → add new menu item
router.post('/', upload.single('image'), menuController.createMenuItem);

// PATCH /api/menu/:id/availability → toggle availability
router.patch('/:id/availability', menuController.updateAvailability);

// PATCH /api/menu/:id → update any fields
router.patch('/:id', upload.single('image'), menuController.updateMenuItem);

// DELETE /api/menu/:id → delete item
router.delete('/:id', menuController.deleteMenuItem);

export default router;
