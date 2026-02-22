import { Router } from 'express';
import * as orderController from './order.controller.js';
import { verifyJWT } from '../../middleware/auth.middleware.js';
import { allowRoles } from '../../middleware/role.middleware.js';

const router = Router();

router.use(verifyJWT);

// POST /api/orders
router.post('/', allowRoles('visitor'), orderController.createOrder);

// GET /api/orders/visitor/my?status=new&page=1&limit=10
router.get(
  '/visitor/my',
  allowRoles('visitor'),
  orderController.getMyOrdersForVisitor
);

// ── Exhibitor
// GET /api/orders/my
// GET /api/orders/my-orders
router.get('/my', allowRoles('exhibitor'), orderController.getMyOrders);
router.get('/my-orders', allowRoles('exhibitor'), orderController.getMyOrders);

// GET /api/orders/my-stats
router.get('/my-stats', allowRoles('exhibitor'), orderController.getMyStats);
router.get('/my-sales', allowRoles('exhibitor'), orderController.getMyStats);

// GET /api/orders/booth/:boothId
router.get(
  '/booth/:boothId',
  allowRoles('exhibitor', 'admin'),
  orderController.getOrdersByBooth
);

// PATCH /api/orders/:id/status
router.patch(
  '/:id/status',
  allowRoles('exhibitor', 'admin'),
  orderController.updateOrderStatus
);

// GET /api/orders/reports/exhibitor-sales?boothId=
router.get(
  '/exhibitor-sales',
  allowRoles('exhibitor'),
  orderController.getExhibitorSalesReport
);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/', allowRoles('admin'), orderController.getAllOrders);
router.get('/sales', allowRoles('admin'), orderController.getSalesReport);

// Admin Specific Reports
router.get(
  '/event-sales/:eventId',
  allowRoles('admin'),
  orderController.getEventSalesReport
);
router.get(
  '/booth-sales/:eventId',
  allowRoles('admin'),
  orderController.getBoothSalesByEventReport
);
router.get(
  '/dashboard',
  allowRoles('admin'),
  orderController.getAdminDashboardStats
);
router.get(
  '/reports/dashboard',
  allowRoles('admin'),
  orderController.getAdminDashboardStats
);

router.get(
  '/:id',
  allowRoles('visitor', 'exhibitor', 'admin'),
  orderController.getOrderById
);

export default router;
