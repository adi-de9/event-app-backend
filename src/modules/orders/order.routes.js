import { Router } from 'express';
import * as orderController from './order.controller.js';
import { verifyJWT } from '../../middleware/auth.middleware.js';
import { allowRoles } from '../../middleware/role.middleware.js';

const router = Router();

router.use(verifyJWT);

// Visitor: Place Order
router.post('/', allowRoles('visitor'), orderController.createOrder);
router.get(
  '/:id',
  allowRoles('visitor', 'exhibitor', 'admin'),
  orderController.getOrderById
);

// Exhibitor: View orders for booth, update status
router.get(
  '/booth/:boothId',
  allowRoles('exhibitor'),
  orderController.getOrdersByBooth
);
router.patch(
  '/:id/status',
  allowRoles('exhibitor'),
  orderController.updateOrderStatus
);

// Admin: View all orders, Reports
router.get('/', allowRoles('admin'), orderController.getAllOrders);
router.get(
  '/reports/sales',
  allowRoles('admin'),
  orderController.getSalesReport
);

export default router;
