import { Router } from 'express';
import * as orderController from './order.controller.js';
import { verifyJWT } from '../../middleware/auth.middleware.js';
import { allowRoles } from '../../middleware/role.middleware.js';

const router = Router();

router.use(verifyJWT);

// ─── Static paths first (before /:id to avoid collisions) ─────────────────────

// ── Visitor ──────────────────────────────────────────────────────────────────
// POST /api/orders         → Place a new order
router.post('/', allowRoles('visitor'), orderController.createOrder);

// GET /api/orders/visitor/my?status=new&page=1&limit=10
//   → Paginated order history for logged-in visitor, optional status filter
router.get(
  '/visitor/my',
  allowRoles('visitor'),
  orderController.getMyOrdersForVisitor
);

// ── Exhibitor ─────────────────────────────────────────────────────────────────
// GET /api/orders/my           → Exhibitor's own booth orders (simple list)
// GET /api/orders/my-orders    → alias
router.get('/my', allowRoles('exhibitor'), orderController.getMyOrders);
router.get('/my-orders', allowRoles('exhibitor'), orderController.getMyOrders);

// GET /api/orders/my-stats     → Dashboard totals
router.get('/my-stats', allowRoles('exhibitor'), orderController.getMyStats);
router.get('/my-sales', allowRoles('exhibitor'), orderController.getMyStats);

// GET /api/orders/booth/:boothId → All orders for exhibitor's booth
router.get(
  '/booth/:boothId',
  allowRoles('exhibitor', 'admin'),
  orderController.getOrdersByBooth
);

// PATCH /api/orders/:id/status  → Advance order status (strict transition chain)
router.patch(
  '/:id/status',
  allowRoles('exhibitor', 'admin'),
  orderController.updateOrderStatus
);

// GET /api/orders/reports/exhibitor-sales?boothId=
router.get(
  '/reports/exhibitor-sales',
  allowRoles('exhibitor'),
  orderController.getExhibitorSalesReport
);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/', allowRoles('admin'), orderController.getAllOrders);
router.get(
  '/reports/sales',
  allowRoles('admin'),
  orderController.getSalesReport
);

// ── Shared: single order details ─────────────────────────────────────────────
// Visitor: can only view their own orders (service-layer check)
// Exhibitor: can only view orders for their booth (service-layer check)
router.get(
  '/:id',
  allowRoles('visitor', 'exhibitor', 'admin'),
  orderController.getOrderById
);

export default router;
