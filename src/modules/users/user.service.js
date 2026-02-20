import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

export const getUserById = async (id) => {
  const { rows } = await query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0];
};

export const updateUserProfile = async (id, data) => {
  const keys = Object.keys(data);
  if (keys.length === 0) return getUserById(id);

  const setClause = keys
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ');
  const values = [id, ...Object.values(data)];

  const { rows } = await query(
    `UPDATE users SET ${setClause} WHERE id = $1 RETURNING id, name, email, role, created_at`,
    values
  );
  return rows[0];
};
