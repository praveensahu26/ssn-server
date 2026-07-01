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
  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    from: process.env.EMAIL_FROM,
  },
  google: {
    // OAuth client ID(s) a Google Sign-In idToken's `aud` claim must match.
    // From google-services.json: the client_type 3 (web) client id, plus any other client ids (iOS, etc.) you sign in with.
    clientIds: (process.env.GOOGLE_CLIENT_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  },
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    name: process.env.SUPER_ADMIN_NAME,
  },
  s3: {
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_S3_BUCKET,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    currency: process.env.STRIPE_CURRENCY || 'usd',
  },
};

module.exports = config;
