import { Router } from 'express';
import * as boothController from './booth.controller.js';
import { verifyJWT } from '../../middleware/auth.middleware.js';
import { allowRoles } from '../../middleware/role.middleware.js';

const router = Router();

// ─── Public (no auth required) ───────────────────────────────────────────────
/**
 * GET /api/booths/event/:eventId
 * Visitor: browse all assigned booths for an event.
 * Returns: booth_number, exhibitor_name, menu_item_count (available items only).
 */
router.get('/event/:eventId', boothController.getBoothsByEvent);

// Admin: Monitor all booths for an event (including available)
router.get(
  '/admin/event/:eventId',
  verifyJWT,
  allowRoles('admin'),
  boothController.getBoothsForAdminByEvent
);

// ─── Authenticated ────────────────────────────────────────────────────────────
router.use(verifyJWT);

/**
 * GET /api/booths/my?eventId=<id>
 * Exhibitor: get their own assigned booth.
 */
router.get('/my', allowRoles('exhibitor'), boothController.getMyBooth);

/**
 * GET /api/booths/:id
 * Any authenticated user: get booth details.
 */
router.get(
  '/:id',
  allowRoles('exhibitor', 'admin', 'visitor'),
  boothController.getBoothById
);

export default router;
