import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import * as menuService from './menu.service.js';
import { uploadOnCloudinary } from '../../utils/cloudinary.js';
import { AppError } from '../../utils/appError.js';

export const createMenuItem = asyncHandler(async (req, res) => {
  const imageLocalPath = req.file?.path;

  let image_url = req.body.image_url;
  if (image_url === 'null' || image_url === '') image_url = null;

  if (imageLocalPath) {
    console.log('Uploading image to Cloudinary:', imageLocalPath);
    const cloudinaryResponse = await uploadOnCloudinary(imageLocalPath);
    if (cloudinaryResponse) {
      console.log('Cloudinary Upload Success:', cloudinaryResponse.secure_url);
      image_url = cloudinaryResponse.secure_url;
    } else {
      console.error('Cloudinary Upload Failed');
    }
  }

  const item = await menuService.createMenuItem(req.user.id, {
    ...req.body,
    image_url: image_url || null,
  });

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

export const getMyMenu = asyncHandler(async (req, res) => {
  const menu = await menuService.getMyMenu(req.user.id);
  return res
    .status(200)
    .json(new ApiResponse(200, menu, 'My menu items fetched successfully'));
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const imageLocalPath = req.file?.path;

  let updateData = { ...req.body };

  if (updateData.image_url === 'null' || updateData.image_url === '') {
    updateData.image_url = null;
  }

  if (imageLocalPath) {
    const cloudinaryResponse = await uploadOnCloudinary(imageLocalPath);
    if (cloudinaryResponse) {
      updateData.image_url = cloudinaryResponse.secure_url;
    }
  }

  const item = await menuService.updateMenuItem(
    req.user.id,
    req.params.id,
    updateData
  );
  return res
    .status(200)
    .json(new ApiResponse(200, item, 'Menu item updated successfully'));
});

export const updateAvailability = asyncHandler(async (req, res) => {
  const { availability } = req.body;
  if (typeof availability === 'undefined') {
    return res
      .status(400)
      .json({ success: false, message: 'availability is required' });
  }
  const item = await menuService.updateAvailability(
    req.user.id,
    req.params.id,
    availability
  );
  return res
    .status(200)
    .json(new ApiResponse(200, item, 'Availability updated successfully'));
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  await menuService.deleteMenuItem(req.user.id, req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Menu item deleted successfully'));
});
