// ===========================================================================
// REPOSITORY LAYER — the ONLY file that knows *where* tasks are stored.
// ===========================================================================
// Now backed by a real PostgreSQL database running in Docker, instead of
// SQLite. The routes and the service still only ever call
// findAll / findById / create / update / remove — they don't care what's
// behind them. The one unavoidable change: since Postgres talks over a
// network, every call here is now asynchronous (returns a Promise).

const { Pool } = require('pg');

// Reads DATABASE_URL from .env (loaded via `node --env-file=.env` or dotenv
// in index.js) and creates a pool of reusable connections to Postgres.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create the table if it doesn't already exist. Runs on startup — an
// immediately-invoked async function since top-level await needs care.
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT false
    )
  `);

  const { rows } = await pool.query('SELECT COUNT(*) AS count FROM tasks');
  if (Number(rows[0].count) === 0) {
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Buy groceries', false]);
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Walk the dog', true]);
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Read a book', false]);
  }
}

// Postgres already gives us real booleans (unlike SQLite's 0/1), so no
// conversion helper is needed this time — rows come back in the right shape.

async function findAll() {
  const { rows } = await pool.query('SELECT * FROM tasks ORDER BY id');
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create({ title, done }) {
  const { rows } = await pool.query(
    'INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *',
    [title, done ?? false]
  );
  return rows[0];
}

async function update(id, changes) {
  const existing = await findById(id);
  if (!existing) return null;

  const title = changes.title !== undefined ? changes.title : existing.title;
  const done = changes.done !== undefined ? changes.done : existing.done;

  const { rows } = await pool.query(
    'UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *',
    [title, done, id]
  );
  return rows[0];
}

async function remove(id) {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  return result.rowCount > 0;
}

async function reset() {
  await pool.query('DELETE FROM tasks');
  await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Buy groceries', false]);
  await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Walk the dog', true]);
  await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Read a book', false]);
  return findAll();
}

module.exports = { init, findAll, findById, create, update, remove, reset };