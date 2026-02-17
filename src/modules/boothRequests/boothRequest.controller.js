import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import * as boothRequestService from './boothRequest.service.js';

export const createBoothRequest = asyncHandler(async (req, res) => {
  const request = await boothRequestService.createBoothRequest({
    event_id: req.body.event_id,
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
