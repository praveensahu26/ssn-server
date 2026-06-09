const mongoose = require('mongoose');

const app = require('./app');
const config = require('./config/config');

let server;

const exitHandler = () => {
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

mongoose.connect(config.mongoose.url).then(() => {
  // eslint-disable-next-line no-console
  console.log('Connected to MongoDB');
  server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Listening on port ${config.port}`);
  });
});

process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  console.log('SIGTERM received');
  if (server) {
    server.close();
  }
});
