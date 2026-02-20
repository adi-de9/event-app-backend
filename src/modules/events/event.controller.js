import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import * as eventService from './event.service.js';

export const createEvent = asyncHandler(async (req, res) => {
  const event = await eventService.createEvent(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, event, 'Event created successfully'));
});

export const getAllEvents = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const result = await eventService.getAllEvents(status, page, limit);
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Events fetched successfully'));
});

export const getEventById = asyncHandler(async (req, res) => {
  const event = await eventService.getEventById(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, event, 'Event details fetched successfully'));
});

export const updateEvent = asyncHandler(async (req, res) => {
  const event = await eventService.updateEvent(req.params.id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, event, 'Event updated successfully'));
});

export const deleteEvent = asyncHandler(async (req, res) => {
  await eventService.deleteEvent(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Event deleted successfully'));
});
