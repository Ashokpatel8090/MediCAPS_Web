import pool from '../config/db.js';

export const deactivateUser = async (userId) => {
  const [result] = await pool.execute(
    'UPDATE users SET is_active = false WHERE id = ? AND is_active = true',
    [userId]
  );
  return result.affectedRows;
};

export const isUserActive = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT is_active FROM users WHERE id = ?',
    [userId]
  );
  return rows.length > 0 ? rows[0].is_active : null;
};

export const activateUser = async (userId) => {
  const [result] = await pool.execute(
    'UPDATE users SET is_active = true WHERE id = ? AND is_active = false',
    [userId]
  );
  return result.affectedRows;
};