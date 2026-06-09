const dotenv = require('dotenv');

dotenv.config();

const config = {
  env: process.env.NODE_ENV,
  port: process.env.PORT || 3000,
  mongoose: {
    url: process.env.MONGODB_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpirationMinutes: process.env.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: process.env.JWT_REFRESH_EXPIRATION_DAYS,
  },
};

module.exports = config;
