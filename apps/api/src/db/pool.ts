import pg from 'pg';
import { env } from '../env.js';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10
});

export async function closePool() {
  await pool.end();
}

