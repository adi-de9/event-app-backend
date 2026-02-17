import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

export const createMenuItem = async (
  userId,
  { booth_id, name, description, price, image_url, availability }
) => {
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
    'INSERT INTO menu_items (booth_id, name, description, price, image_url, availability) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [booth_id, name, description, price, image_url, availability]
  );
  return rows[0];
};

export const getMenuByBoothId = async (boothId) => {
  const { rows } = await query(
    'SELECT * FROM menu_items WHERE booth_id = $1 ORDER BY created_at DESC',
    [boothId]
  );
  return rows;
};

export const updateMenuItem = async (userId, itemId, data) => {
  // 1. Get Item and Booth info
  const itemResult = await query(
    `SELECT m.*, b.exhibitor_id 
     FROM menu_items m 
     JOIN booths b ON m.booth_id = b.id 
     WHERE m.id = $1`,
    [itemId]
  );
  const item = itemResult.rows[0];

  if (!item) throw new AppError(404, 'Menu item not found');
  if (item.exhibitor_id !== userId)
    throw new AppError(403, 'You do not own this menu item');

  // 2. Update
  const keys = Object.keys(data);
  if (keys.length === 0) return item;

  const setClause = keys
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ');
  const values = [itemId, ...Object.values(data)];

  const { rows } = await query(
    `UPDATE menu_items SET ${setClause} WHERE id = $1 RETURNING *`,
    values
  );
  return rows[0];
};

export const deleteMenuItem = async (userId, itemId) => {
  // 1. Check ownership
  const itemResult = await query(
    `SELECT m.*, b.exhibitor_id 
     FROM menu_items m 
     JOIN booths b ON m.booth_id = b.id 
     WHERE m.id = $1`,
    [itemId]
  );
  const item = itemResult.rows[0];

  if (!item) throw new AppError(404, 'Menu item not found');
  if (item.exhibitor_id !== userId)
    throw new AppError(403, 'You do not own this menu item');

  await query('DELETE FROM menu_items WHERE id = $1', [itemId]);
  return true;
};
