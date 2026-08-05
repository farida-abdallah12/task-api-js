// Entry point. Its ONLY job is to start the server.
require('dotenv').config();

const { createApp } = require('./src/app');
const repo = require('./src/repositories/tasks.repository');

const app = createApp();
const port = process.env.PORT || 3000;

repo.init().then(() => {
  app.listen(port, () => {
    console.log(`CRUD API listening on port ${port}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});