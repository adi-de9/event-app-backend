import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import * as menuService from './menu.service.js';

export const createMenuItem = asyncHandler(async (req, res) => {
  const item = await menuService.createMenuItem(req.user.id, req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, item, 'Menu item created successfully'));
});

export const getMenuByBoothId = asyncHandler(async (req, res) => {
  const items = await menuService.getMenuByBoothId(req.params.boothId);
  return res
    .status(200)
    .json(new ApiResponse(200, items, 'Menu items fetched successfully'));
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await menuService.updateMenuItem(
    req.user.id,
    req.params.id,
    req.body
  );
  return res
    .status(200)
    .json(new ApiResponse(200, item, 'Menu item updated successfully'));
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  await menuService.deleteMenuItem(req.user.id, req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Menu item deleted successfully'));
});
