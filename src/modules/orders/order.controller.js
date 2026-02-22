import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import * as orderService from './order.service.js';

export const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.user.id, req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, order, 'Order placed successfully'));
});

export const getOrderById = asyncHandler(async (req, res) => {
  // Pass the requester's id and role so service can enforce ownership
  const order = await orderService.getOrderById(
    req.params.id,
    req.user.id,
    req.user.role
  );
  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Order fetched successfully'));
});

/**
 * Visitor-specific: paginated list of their own orders with optional status filter.
 * GET /api/orders/visitor/my?status=new&page=1&limit=10
 */
export const getMyOrdersForVisitor = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const result = await orderService.getMyOrdersForVisitor(req.user.id, {
    status,
    page,
    limit,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'My orders fetched successfully'));
});

export const getOrdersByBooth = asyncHandler(async (req, res) => {
  // Pass userId so the service can guard ownership
  const orders = await orderService.getOrdersByBooth(
    req.params.boothId,
    req.user.id
  );
  return res
    .status(200)
    .json(new ApiResponse(200, orders, 'Orders fetched successfully'));
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const { eventId, boothId, status } = req.query;
  const orders = await orderService.getAllOrders({ eventId, boothId, status });
  return res
    .status(200)
    .json(new ApiResponse(200, orders, 'All orders fetched successfully'));
});

export const getEventSalesReport = asyncHandler(async (req, res) => {
  const report = await orderService.getEventSalesReport(req.params.eventId);
  return res
    .status(200)
    .json(
      new ApiResponse(200, report, 'Event sales report fetched successfully')
    );
});

export const getBoothSalesByEventReport = asyncHandler(async (req, res) => {
  const report = await orderService.getBoothSalesByEventReport(
    req.params.eventId
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        report,
        'Booth sales by event report fetched successfully'
      )
    );
});

export const getAdminDashboardStats = asyncHandler(async (req, res) => {
  const stats = await orderService.getAdminDashboardStats();
  return res
    .status(200)
    .json(
      new ApiResponse(200, stats, 'Admin dashboard stats fetched successfully')
    );
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res
      .status(400)
      .json({ success: false, message: 'status is required' });
  }
  const order = await orderService.updateOrderStatus(
    req.user.id,
    req.params.id,
    status
  );
  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Order status updated successfully'));
});

export const getSalesReport = asyncHandler(async (req, res) => {
  const report = await orderService.getSalesReport();
  return res
    .status(200)
    .json(new ApiResponse(200, report, 'Sales report fetched successfully'));
});

export const getMyStats = asyncHandler(async (req, res) => {
  const stats = await orderService.getMyStats(req.user.id);
  return res
    .status(200)
    .json(new ApiResponse(200, stats, 'Stats fetched successfully'));
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getMyOrders(req.user.id);
  return res
    .status(200)
    .json(new ApiResponse(200, orders, 'My orders fetched successfully'));
});

/**
 * GET /api/reports/exhibitor-sales?boothId=<id>
 */
export const getExhibitorSalesReport = asyncHandler(async (req, res) => {
  const { boothId } = req.query;
  if (!boothId) {
    return res
      .status(400)
      .json({ success: false, message: 'boothId query param is required' });
  }
  const report = await orderService.getExhibitorSalesReport(
    req.user.id,
    boothId
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        report,
        'Exhibitor sales report fetched successfully'
      )
    );
});
