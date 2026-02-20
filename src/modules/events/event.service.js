import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

export const createEvent = async ({
  name,
  description,
  date,
  location,
  total_booths,
}) => {
  const client = await import('../../config/db.js').then((m) =>
    m.default.connect()
  );

  try {
    await client.query('BEGIN');

    const eventResult = await client.query(
      'INSERT INTO events (name, description, date, location, total_booths) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, date, location, total_booths]
    );
    const event = eventResult.rows[0];

    // Auto-generate booths
    for (let i = 1; i <= total_booths; i++) {
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
 * status = 'upcoming' → date > TODAY
 * status = 'live'     → DATE(date) = CURRENT_DATE  (event is happening today)
 * status = 'past'     → date < NOW()
 * page / limit        → for pagination (defaults: page=1, limit=10)
 */
export const getAllEvents = async (status, page = 1, limit = 10) => {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  let whereClause = '';

  if (status === 'upcoming') {
    whereClause = 'WHERE DATE(date) > CURRENT_DATE';
  } else if (status === 'live') {
    whereClause = 'WHERE DATE(date) = CURRENT_DATE';
  } else if (status === 'past') {
    whereClause = 'WHERE date < NOW()';
  }

  // Total count for pagination metadata
  const countResult = await query(`SELECT COUNT(*) FROM events ${whereClause}`);
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await query(
    `SELECT * FROM events ${whereClause} ORDER BY date ASC LIMIT $1 OFFSET $2`,
    [parseInt(limit, 10), offset]
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

export const getEventById = async (id) => {
  const { rows } = await query('SELECT * FROM events WHERE id = $1', [id]);
  const event = rows[0];
  if (!event) throw new AppError(404, 'Event not found');

  // Get booths + available count
  const boothResult = await query(
    `SELECT b.*,
       CASE WHEN br.status = 'approved' THEN true ELSE false END AS is_occupied
     FROM booths b
     LEFT JOIN booth_requests br ON b.id = br.booth_id AND br.status = 'approved'
     WHERE b.event_id = $1
     ORDER BY b.booth_number ASC`,
    [id]
  );
  event.booths = boothResult.rows;
  event.total_booths = boothResult.rows.length;
  event.available_booths = boothResult.rows.filter(
    (b) => !b.is_occupied
  ).length;

  return event;
};

export const updateEvent = async (id, data) => {
  const keys = Object.keys(data);
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

export const deleteEvent = async (id) => {
  const { rowCount } = await query('DELETE FROM events WHERE id = $1', [id]);
  if (rowCount === 0) throw new AppError(404, 'Event not found');
  return true;
};
