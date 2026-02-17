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
  const order = await orderService.getOrderById(req.params.id);
  // Optional: Check if user is allowed to view this order (visitor who made it, or owner of booth)
  // For simplicity assuming public read or handled by frontend filters, typically strict backend check needed
  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Order fetched successfully'));
});

export const getOrdersByBooth = asyncHandler(async (req, res) => {
  const orders = await orderService.getOrdersByBooth(req.params.boothId);
  // Should ideally verify booth ownership here too or rely on service
  return res
    .status(200)
    .json(new ApiResponse(200, orders, 'Orders fetched successfully'));
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getAllOrders();
  return res
    .status(200)
    .json(new ApiResponse(200, orders, 'All orders fetched successfully'));
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
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
