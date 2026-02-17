import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

export const createBoothRequest = async ({ event_id, exhibitor_id }) => {
  // Check if exhibitor already has a request for this event
  const existingRequest = await query(
    'SELECT * FROM booth_requests WHERE event_id = $1 AND exhibitor_id = $2',
    [event_id, exhibitor_id]
  );

  if (existingRequest.rows.length > 0) {
    throw new AppError(
      409,
      'You have already requested a booth for this event'
    );
  }

  const { rows } = await query(
    'INSERT INTO booth_requests (event_id, exhibitor_id) VALUES ($1, $2) RETURNING *',
    [event_id, exhibitor_id]
  );
  return rows[0];
};

export const getAllBoothRequests = async () => {
  const { rows } = await query(`
    SELECT br.*, u.name as exhibitor_name, u.email as exhibitor_email, e.name as event_name 
    FROM booth_requests br
    JOIN users u ON br.exhibitor_id = u.id
    JOIN events e ON br.event_id = e.id
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

    // 1. Get the request
    const requestResult = await client.query(
      'SELECT * FROM booth_requests WHERE id = $1',
      [id]
    );
    const request = requestResult.rows[0];

    if (!request) throw new AppError(404, 'Booth request not found');
    if (request.status !== 'pending')
      throw new AppError(400, 'Request is not pending');

    // 2. Find first available booth for the event
    const boothResult = await client.query(
      'SELECT * FROM booths WHERE event_id = $1 AND status = $2 ORDER BY booth_number ASC LIMIT 1',
      [request.event_id, 'available']
    );
    const booth = boothResult.rows[0];

    if (!booth) throw new AppError(400, 'No available booths for this event');

    // 3. Assign booth to exhibitor
    await client.query(
      'UPDATE booths SET status = $1, exhibitor_id = $2 WHERE id = $3',
      ['assigned', request.exhibitor_id, booth.id]
    );

    // 4. Update request status
    const updateResult = await client.query(
      'UPDATE booth_requests SET status = $1 WHERE id = $2 RETURNING *',
      ['approved', id]
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
    // Check if it exists but wasn't pending
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
