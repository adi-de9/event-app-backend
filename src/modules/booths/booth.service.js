import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

/**
 * Get the booth assigned to the logged-in exhibitor, optionally filtered by eventId.
 */
export const getMyBooth = async (exhibitorId, eventId) => {
  let queryStr = `
    SELECT 
      b.*,
      e.name     AS event_name,
      e.date     AS event_date,
      e.location AS event_location
    FROM booths b
    JOIN events e ON b.event_id = e.id
    WHERE b.exhibitor_id = $1
  `;
  const params = [exhibitorId];

  if (eventId) {
    queryStr += ` AND b.event_id = $2`;
    params.push(eventId);
  }

  queryStr += ' ORDER BY b.created_at DESC';

  const { rows } = await query(queryStr, params);
  return rows;
};

/**
 * Visitor: Get all ASSIGNED booths for an event.
 * Only returns booths with status = 'assigned' (i.e., has an exhibitor).
 * Includes exhibitor name so visitor knows who's at the booth.
 */
export const getBoothsByEvent = async (eventId) => {
  // Validate event exists
  const eventCheck = await query('SELECT id FROM events WHERE id = $1', [
    eventId,
  ]);
  if (!eventCheck.rows[0]) throw new AppError(404, 'Event not found');

  const { rows } = await query(
    `SELECT
       b.id,
       b.booth_number,
       b.status,
       b.event_id,
       u.id   AS exhibitor_id,
       u.name AS exhibitor_name,
       e.name AS event_name,
       COUNT(m.id) AS menu_item_count
     FROM booths b
     JOIN events e ON b.event_id = e.id
     JOIN users  u ON b.exhibitor_id = u.id
     LEFT JOIN menu_items m ON m.booth_id = b.id AND m.availability = true
     WHERE b.event_id = $1
       AND b.status   = 'assigned'
     GROUP BY b.id, u.id, u.name, e.name
     ORDER BY b.booth_number ASC`,
    [eventId]
  );
  return rows;
};

/**
 * Get booth details by id (used by admin / public menu view).
 */
export const getBoothById = async (id) => {
  const { rows } = await query(
    `SELECT b.*, e.name AS event_name, u.name AS exhibitor_name
     FROM booths b
     JOIN events e ON b.event_id = e.id
     LEFT JOIN users u ON b.exhibitor_id = u.id
     WHERE b.id = $1`,
    [id]
  );
  if (!rows[0]) throw new AppError(404, 'Booth not found');
  return rows[0];
};
