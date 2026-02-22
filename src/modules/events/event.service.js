import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

/**
 * Create a new event and auto-generate booths.
 */
export const createEvent = async ({
  name,
  description,
  date,
  location,
  totalBooths, // Support camelCase from API
  total_booths, // Support snake_case
  status = 'upcoming',
}) => {
  const finalTotalBooths = totalBooths || total_booths;
  if (!finalTotalBooths) throw new AppError(400, 'totalBooths is required');

  const client = await import('../../config/db.js').then((m) =>
    m.default.connect()
  );

  try {
    await client.query('BEGIN');

    const eventResult = await client.query(
      'INSERT INTO events (name, description, date, location, total_booths, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, date, location, finalTotalBooths, status]
    );
    const event = eventResult.rows[0];

    // Auto-generate booths
    for (let i = 1; i <= finalTotalBooths; i++) {
      await client.query(
        'INSERT INTO booths (event_id, booth_number) VALUES ($1, $2)',
        [event.id, i]
      );
    }

    await client.query('COMMIT');
    return event;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get all events, optionally filtered by status and with pagination.
 */
export const getAllEvents = async (status, page = 1, limit = 10) => {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let whereClause = '';
  let params = [];

  if (status) {
    if (status === 'upcoming') {
      whereClause = 'WHERE DATE(date) > CURRENT_DATE';
    } else if (status === 'live') {
      whereClause = 'WHERE DATE(date) = CURRENT_DATE';
    } else if (status === 'past') {
      whereClause = 'WHERE date < NOW()';
    } else {
      whereClause = 'WHERE status = $1';
      params.push(status);
    }
  }

  // Total count for pagination metadata
  const countResult = await query(
    `SELECT COUNT(*) FROM events ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const queryParams = [...params, parseInt(limit, 10), offset];
  const { rows } = await query(
    `SELECT * FROM events ${whereClause} ORDER BY date ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    queryParams
  );

  return {
    data: rows,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};

/**
 * Get event by ID with booth details.
 */
export const getEventById = async (id) => {
  const { rows } = await query('SELECT * FROM events WHERE id = $1', [id]);
  const event = rows[0];
  if (!event) throw new AppError(404, 'Event not found');

  // Get booths + exhibitor info if assigned
  const boothResult = await query(
    `SELECT b.*,
            u.name as exhibitor_name,
            u.email as exhibitor_email
     FROM booths b
     LEFT JOIN users u ON b.exhibitor_id = u.id
     WHERE b.event_id = $1
     ORDER BY b.booth_number ASC`,
    [id]
  );

  event.booths = boothResult.rows;
  event.available_booths_count = boothResult.rows.filter(
    (b) => b.status === 'available'
  ).length;

  return event;
};

/**
 * Update event details.
 */
export const updateEvent = async (id, data) => {
  const keys = Object.keys(data).filter((k) => k !== 'id');
  if (keys.length === 0) return getEventById(id);

  const setClause = keys
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ');
  const values = [id, ...Object.values(data)];

  const { rows } = await query(
    `UPDATE events SET ${setClause} WHERE id = $1 RETURNING *`,
    values
  );

  if (rows.length === 0) throw new AppError(404, 'Event not found');
  return rows[0];
};

/**
 * Close an event.
 * Prevents new requests and orders.
 */
export const closeEvent = async (id) => {
  const { rows } = await query(
    "UPDATE events SET status = 'closed' WHERE id = $1 RETURNING *",
    [id]
  );
  if (rows.length === 0) throw new AppError(404, 'Event not found');
  return rows[0];
};

/**
 * Delete an event.
 */
export const deleteEvent = async (id) => {
  const { rowCount } = await query('DELETE FROM events WHERE id = $1', [id]);
  if (rowCount === 0) throw new AppError(404, 'Event not found');
  return true;
};
