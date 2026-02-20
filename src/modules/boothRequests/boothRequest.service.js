import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

/**
 * Create a booth request for an event.
 * Validates: event exists, has available booths, no duplicate request.
 */
export const createBoothRequest = async ({ event_id, exhibitor_id }) => {
  // 1. Check event exists
  const eventResult = await query('SELECT * FROM events WHERE id = $1', [
    event_id,
  ]);
  if (eventResult.rows.length === 0) {
    throw new AppError(404, 'Event not found');
  }

  // 2. Check there is at least one available booth
  const boothResult = await query(
    "SELECT COUNT(*) FROM booths WHERE event_id = $1 AND status = 'available'",
    [event_id]
  );
  if (parseInt(boothResult.rows[0].count, 10) === 0) {
    throw new AppError(400, 'No available booths for this event');
  }

  // 3. Prevent duplicate request
  const existingRequest = await query(
    'SELECT id FROM booth_requests WHERE event_id = $1 AND exhibitor_id = $2',
    [event_id, exhibitor_id]
  );
  if (existingRequest.rows.length > 0) {
    throw new AppError(
      409,
      'You have already requested a booth for this event'
    );
  }

  const { rows } = await query(
    `INSERT INTO booth_requests (event_id, exhibitor_id, status)
     VALUES ($1, $2, 'pending') RETURNING *`,
    [event_id, exhibitor_id]
  );
  return rows[0];
};

export const getAllBoothRequests = async () => {
  const { rows } = await query(`
    SELECT br.*,
           u.name  AS exhibitor_name,
           u.email AS exhibitor_email,
           e.name  AS event_name,
           b.booth_number,
           b.id    AS booth_id
    FROM booth_requests br
    JOIN users  u ON br.exhibitor_id = u.id
    JOIN events e ON br.event_id     = e.id
    -- Join booths via exhibitor+event (no booth_id column on booth_requests)
    LEFT JOIN booths b
           ON b.exhibitor_id = br.exhibitor_id
          AND b.event_id     = br.event_id
          AND b.status       = 'assigned'
    ORDER BY br.created_at DESC
  `);
  return rows;
};

export const approveBoothRequest = async (id) => {
  const client = await import('../../config/db.js').then((m) =>
    m.default.connect()
  );
  try {
    await client.query('BEGIN');

    const requestResult = await client.query(
      'SELECT * FROM booth_requests WHERE id = $1',
      [id]
    );
    const request = requestResult.rows[0];
    if (!request) throw new AppError(404, 'Booth request not found');
    if (request.status !== 'pending')
      throw new AppError(400, 'Request is not pending');

    // Find first available booth for this event
    const boothResult = await client.query(
      "SELECT * FROM booths WHERE event_id = $1 AND status = 'available' ORDER BY booth_number ASC LIMIT 1",
      [request.event_id]
    );
    const booth = boothResult.rows[0];
    if (!booth) throw new AppError(400, 'No available booths for this event');

    // Assign the booth to the exhibitor
    await client.query(
      "UPDATE booths SET status = 'assigned', exhibitor_id = $1 WHERE id = $2",
      [request.exhibitor_id, booth.id]
    );

    // Mark the request as approved (no booth_id column — assignment tracked on booths table)
    const updateResult = await client.query(
      "UPDATE booth_requests SET status = 'approved' WHERE id = $1 RETURNING *",
      [id]
    );

    await client.query('COMMIT');
    return { request: updateResult.rows[0], booth };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const rejectBoothRequest = async (id) => {
  const { rows } = await query(
    "UPDATE booth_requests SET status = 'rejected' WHERE id = $1 AND status = 'pending' RETURNING *",
    [id]
  );
  if (rows.length === 0) {
    const check = await query(
      'SELECT status FROM booth_requests WHERE id = $1',
      [id]
    );
    if (check.rows.length === 0)
      throw new AppError(404, 'Booth request not found');
    throw new AppError(400, 'Request is not pending');
  }
  return rows[0];
};

/**
 * Get all booth requests for the logged-in exhibitor.
 * If approved, includes booth_number via join on booths.exhibitor_id + event_id.
 */
export const getMyBoothRequests = async (exhibitorId) => {
  const { rows } = await query(
    `SELECT
       br.*,
       e.name      AS event_name,
       e.date      AS event_date,
       e.location  AS event_location,
       b.booth_number,
       b.id        AS booth_id
     FROM booth_requests br
     JOIN events e ON br.event_id = e.id
     -- No booth_id column on booth_requests; join via exhibitor+event
     LEFT JOIN booths b
            ON b.exhibitor_id = br.exhibitor_id
           AND b.event_id     = br.event_id
           AND b.status       = 'assigned'
     WHERE br.exhibitor_id = $1
     ORDER BY br.created_at DESC`,
    [exhibitorId]
  );
  return rows;
};

/**
 * Get booths that are approved and assigned to this exhibitor.
 */
export const getMyAssignedBooths = async (exhibitorId) => {
  const { rows } = await query(
    `SELECT
       b.*,
       e.name     AS event_name,
       e.date     AS event_date,
       e.location AS event_location
     FROM booths b
     JOIN events e ON b.event_id = e.id
     WHERE b.exhibitor_id = $1
     ORDER BY b.booth_number ASC`,
    [exhibitorId]
  );
  return rows;
};
