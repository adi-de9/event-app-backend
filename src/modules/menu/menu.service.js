import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

/**
 * Verify that a menu item belongs to the given exhibitor.
 * Throws 403 if not, 404 if item not found.
 */
const verifyMenuOwnership = async (userId, itemId) => {
  const { rows } = await query(
    `SELECT m.*, b.exhibitor_id 
     FROM menu_items m 
     JOIN booths b ON m.booth_id = b.id 
     WHERE m.id = $1`,
    [itemId]
  );
  const item = rows[0];
  if (!item) throw new AppError(404, 'Menu item not found');
  if (item.exhibitor_id !== userId)
    throw new AppError(403, 'You do not own this menu item');
  return item;
};

export const createMenuItem = async (
  userId,
  { booth_id, name, description, price, image_url, availability = true }
) => {
  if (!booth_id) throw new AppError(400, 'booth_id is required');
  if (!name) throw new AppError(400, 'name is required');
  if (!price) throw new AppError(400, 'price is required');

  // Verify booth ownership
  const boothResult = await query(
    'SELECT exhibitor_id FROM booths WHERE id = $1',
    [booth_id]
  );
  const booth = boothResult.rows[0];
  if (!booth) throw new AppError(404, 'Booth not found');
  if (booth.exhibitor_id !== userId)
    throw new AppError(403, 'You do not own this booth');

  const { rows } = await query(
    `INSERT INTO menu_items (booth_id, name, description, price, image_url, availability)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [booth_id, name, description, price, image_url, availability]
  );
  return rows[0];
};

/**
 * Public: Get AVAILABLE menu items for a booth.
 * Visitors only see items currently in stock (availability = true).
 */
export const getMenuByBoothId = async (boothId) => {
  // Validate booth exists
  const boothCheck = await query('SELECT id FROM booths WHERE id = $1', [
    boothId,
  ]);
  if (!boothCheck.rows[0]) throw new AppError(404, 'Booth not found');

  const { rows } = await query(
    `SELECT id, name, description, price, image_url, availability
     FROM menu_items
     WHERE booth_id = $1 AND availability = true
     ORDER BY name ASC`,
    [boothId]
  );
  return rows;
};

/**
 * Exhibitor: Get all menu items across ALL their booths.
 */
export const getMyMenu = async (userId) => {
  const { rows } = await query(
    `SELECT m.*, b.booth_number, e.name AS event_name
     FROM menu_items m
     JOIN booths b ON m.booth_id = b.id
     JOIN events e ON b.event_id = e.id
     WHERE b.exhibitor_id = $1
     ORDER BY m.created_at DESC`,
    [userId]
  );
  return rows;
};

export const updateMenuItem = async (userId, itemId, data) => {
  await verifyMenuOwnership(userId, itemId);

  const allowed = ['name', 'description', 'price', 'image_url', 'availability'];
  const keys = Object.keys(data).filter((k) => allowed.includes(k));
  if (keys.length === 0) throw new AppError(400, 'No valid fields to update');

  const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
  const values = [itemId, ...keys.map((k) => data[k])];

  const { rows } = await query(
    `UPDATE menu_items SET ${setClause} WHERE id = $1 RETURNING *`,
    values
  );
  return rows[0];
};

/**
 * PATCH /menu/:id/availability
 * Dedicated endpoint to toggle availability only.
 */
export const updateAvailability = async (userId, itemId, availability) => {
  await verifyMenuOwnership(userId, itemId);

  if (typeof availability !== 'boolean') {
    throw new AppError(400, 'availability must be a boolean');
  }

  const { rows } = await query(
    'UPDATE menu_items SET availability = $1 WHERE id = $2 RETURNING *',
    [availability, itemId]
  );
  return rows[0];
};

export const deleteMenuItem = async (userId, itemId) => {
  await verifyMenuOwnership(userId, itemId);
  await query('DELETE FROM menu_items WHERE id = $1', [itemId]);
  return true;
};
