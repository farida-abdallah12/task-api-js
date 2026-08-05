// ===========================================================================
// SERVICE LAYER — the business rules. Storage-agnostic and HTTP-agnostic.
// ===========================================================================
const repo = require('../repositories/tasks.repository');
const { NotFoundError, ValidationError } = require('../errors');

async function listTasks({ done, search } = {}) {
  let result = await repo.findAll();

  if (done !== undefined) {
    if (done !== 'true' && done !== 'false') {
      throw new ValidationError('done must be true or false');
    }
    const wantDone = done === 'true';
    result = result.filter((t) => t.done === wantDone);
  }

  if (search !== undefined) {
    const word = String(search).trim();
    if (word === '') {
      throw new ValidationError('search must not be empty');
    }
    const lower = word.toLowerCase();
    result = result.filter((t) => t.title.toLowerCase().includes(lower));
  }

  return result;
}

async function getTask(id) {
  const task = await repo.findById(id);
  if (!task) {
    throw new NotFoundError(`Task ${id} not found`);
  }
  return task;
}

async function createTask(body = {}) {
  const { title } = body;
  if (title === undefined || title === null || String(title).trim() === '') {
    throw new ValidationError('title is required and cannot be empty');
  }
  return repo.create({ title: String(title).trim(), done: false });
}

async function updateTask(id, body = {}) {
  const hasTitle = Object.prototype.hasOwnProperty.call(body, 'title');
  const hasDone = Object.prototype.hasOwnProperty.call(body, 'done');

  if (!hasTitle && !hasDone) {
    throw new ValidationError('request body must include title and/or done');
  }

  const changes = {};

  if (hasTitle) {
    if (body.title === null || String(body.title).trim() === '') {
      throw new ValidationError('title cannot be empty');
    }
    changes.title = String(body.title).trim();
  }

  if (hasDone) {
    if (typeof body.done !== 'boolean') {
      throw new ValidationError('done must be a boolean');
    }
    changes.done = body.done;
  }

  const updated = await repo.update(id, changes);
  if (!updated) {
    throw new NotFoundError(`Task ${id} not found`);
  }
  return updated;
}

async function deleteTask(id) {
  const removed = await repo.remove(id);
  if (!removed) {
    throw new NotFoundError(`Task ${id} not found`);
  }
}

async function getStats() {
  const all = await repo.findAll();
  const done = all.filter((t) => t.done).length;
  return { total: all.length, done, open: all.length - done };
}

async function resetTasks() {
  return repo.reset();
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getStats,
  resetTasks,
};