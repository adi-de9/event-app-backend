import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import * as boothRequestService from './boothRequest.service.js';

export const createBoothRequest = asyncHandler(async (req, res) => {
  // Accept both snake_case and camelCase from frontend
  const event_id = req.body.event_id || req.body.eventId;
  if (!event_id) {
    return res
      .status(400)
      .json({ success: false, message: 'event_id is required' });
  }
  const request = await boothRequestService.createBoothRequest({
    event_id,
    exhibitor_id: req.user.id,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, request, 'Booth requested successfully'));
});

export const getAllBoothRequests = asyncHandler(async (req, res) => {
  const requests = await boothRequestService.getAllBoothRequests();
  return res
    .status(200)
    .json(
      new ApiResponse(200, requests, 'Booth requests fetched successfully')
    );
});

export const approveBoothRequest = asyncHandler(async (req, res) => {
  const result = await boothRequestService.approveBoothRequest(req.params.id);
  return res
    .status(200)
    .json(
      new ApiResponse(200, result, 'Booth request approved and booth assigned')
    );
});

export const rejectBoothRequest = asyncHandler(async (req, res) => {
  const request = await boothRequestService.rejectBoothRequest(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, request, 'Booth request rejected'));
});

export const getMyBoothRequests = asyncHandler(async (req, res) => {
  const requests = await boothRequestService.getMyBoothRequests(req.user.id);
  return res
    .status(200)
    .json(
      new ApiResponse(200, requests, 'My booth requests fetched successfully')
    );
});

export const getMyAssignedBooths = asyncHandler(async (req, res) => {
  const booths = await boothRequestService.getMyAssignedBooths(req.user.id);
  return res
    .status(200)
    .json(
      new ApiResponse(200, booths, 'My assigned booths fetched successfully')
    );
});
