// ===========================================================================
// REPOSITORY LAYER — the ONLY file that knows *where* tasks are stored.
// ===========================================================================
// Now backed by a real SQLite database (tasks.db) instead of an in-memory list.
// The routes and the service NEVER change, because they only ever call
// findAll / findById / create / update / remove — they don't care what's behind them.

const Database = require('better-sqlite3');
const path = require('path');

// Opens tasks.db if it exists, or creates it if it doesn't — either way, `db`
// is now a live connection to that file.
const db = new Database(path.join(__dirname, '..', '..', 'tasks.db'));

// Create the table if it doesn't already exist. Runs every time the app
// starts, but "IF NOT EXISTS" makes it a no-op after the first run.
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
  )
`);

// Seed 3 example tasks — but only if the table is currently empty.
const row = db.prepare('SELECT COUNT(*) AS count FROM tasks').get();
if (row.count === 0) {
  const insertSeed = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  insertSeed.run('Buy groceries', 0);
  insertSeed.run('Walk the dog', 1);
  insertSeed.run('Read a book', 0);
}

// SQLite stores booleans as 0/1 — this converts a raw row into the same
// shape the rest of the app already expects (a real true/false).
function toTaskShape(row) {
  return { id: row.id, title: row.title, done: Boolean(row.done) };
}

function findAll() {
  const rows = db.prepare('SELECT * FROM tasks').all();
  return rows.map(toTaskShape);
}

function findById(id) {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  return row ? toTaskShape(row) : null;
}

function create({ title, done }) {
  const result = db
    .prepare('INSERT INTO tasks (title, done) VALUES (?, ?)')
    .run(title, done ? 1 : 0);
  return findById(result.lastInsertRowid);
}

function update(id, changes) {
  const existing = findById(id);
  if (!existing) return null;

  const title = changes.title !== undefined ? changes.title : existing.title;
  const done = changes.done !== undefined ? changes.done : existing.done;

  db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(
    title,
    done ? 1 : 0,
    id
  );

  return findById(id);
}

function remove(id) {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

function reset() {
  db.exec('DELETE FROM tasks');
  const insertSeed = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  insertSeed.run('Buy groceries', 0);
  insertSeed.run('Walk the dog', 1);
  insertSeed.run('Read a book', 0);
  return findAll();
}

module.exports = { findAll, findById, create, update, remove, reset };