import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import * as boothService from './booth.service.js';

/**
 * GET /api/booths/my?eventId=<id>
 * Exhibitor gets their assigned booth.
 */
export const getMyBooth = asyncHandler(async (req, res) => {
  const { eventId } = req.query;
  const booths = await boothService.getMyBooth(req.user.id, eventId);
  return res
    .status(200)
    .json(new ApiResponse(200, booths, 'My booth fetched successfully'));
});

/**
 * GET /api/booths/event/:eventId
 * Visitor gets all assigned booths for an event (with exhibitor name & menu count).
 */
export const getBoothsByEvent = asyncHandler(async (req, res) => {
  const booths = await boothService.getBoothsByEvent(req.params.eventId);
  return res
    .status(200)
    .json(new ApiResponse(200, booths, 'Booths fetched successfully'));
});

/**
 * GET /api/booths/:id
 * Anyone authenticated can get booth details.
 */
export const getBoothById = asyncHandler(async (req, res) => {
  const booth = await boothService.getBoothById(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, booth, 'Booth details fetched successfully'));
});

export const getBoothsForAdminByEvent = asyncHandler(async (req, res) => {
  const booths = await boothService.getBoothsForAdminByEvent(
    req.params.eventId
  );
  return res
    .status(200)
    .json(new ApiResponse(200, booths, 'Admin booths fetched successfully'));
});
