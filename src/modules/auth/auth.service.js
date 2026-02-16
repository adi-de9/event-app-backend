import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

export const registerUser = async ({ name, email, password, role }) => {
  if (!name || !email || !password || !role) {
    throw new AppError(400, 'All fields are required');
  }

  // Validate role
  if (!['admin', 'exhibitor', 'visitor'].includes(role)) {
    throw new AppError(400, 'Invalid role');
  }

  // Check if user exists
  const existingUser = await query('SELECT * FROM users WHERE email = $1', [
    email,
  ]);
  if (existingUser.rows.length > 0) {
    throw new AppError(409, 'User with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const result = await query(
    'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, email, hashedPassword, role]
  );

  return result.rows[0];
};

export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError(400, 'Email and password are required');
  }

  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  if (!user) {
    throw new AppError(401, 'Invalid user credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid user credentials');
  }

  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  // Remove password from response
  delete user.password;

  return { user, accessToken };
};
