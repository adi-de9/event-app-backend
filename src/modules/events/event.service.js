import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

export const createEvent = async ({
  name,
  description,
  date,
  location,
  total_booths,
}) => {
  // Start transaction
  const client = await import('../../config/db.js').then((m) =>
    m.default.connect()
  );

  try {
    await client.query('BEGIN');

    // 1. Create Event
    const eventResult = await client.query(
      'INSERT INTO events (name, description, date, location, total_booths) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, date, location, total_booths]
    );
    const event = eventResult.rows[0];

    // 2. Auto-generate booths
    const boothValues = [];
    for (let i = 1; i <= total_booths; i++) {
      // ($1, $2, $3)
      // Flattening not ideal for huge numbers, but ok for typical event sizes
      // Using a loop to insert might be slower but safer for simple implementation
      // Or construct a bulk insert query
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

export const getAllEvents = async () => {
  const { rows } = await query('SELECT * FROM events ORDER BY date ASC');
  return rows;
};

export const getEventById = async (id) => {
  const { rows } = await query('SELECT * FROM events WHERE id = $1', [id]);
  const event = rows[0];
  if (!event) throw new AppError(404, 'Event not found');

  // Get booths for this event
  const boothResult = await query(
    'SELECT * FROM booths WHERE event_id = $1 ORDER BY booth_number ASC',
    [id]
  );
  event.booths = boothResult.rows;

  return event;
};

export const updateEvent = async (id, data) => {
  // Dynamic update query construction
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
