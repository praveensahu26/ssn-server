const { OAuth2Client } = require('google-auth-library');
const httpStatus = require('http-status');

const config = require('../config/config');
const ApiError = require('../utils/ApiError');

const isConfigured = () => config.google.clientIds.length > 0;

const client = new OAuth2Client();

/**
 * Verify a Google Sign-In ID token sent by the client and return its decoded
 * claims (sub, email, name, picture, email_verified). This is a plain Google
 * OAuth ID token (issuer accounts.google.com), not a Firebase ID token.
 */
const verifyIdToken = async (idToken) => {
  if (!isConfigured()) {
    throw new ApiError(httpStatus.NOT_IMPLEMENTED, 'Google login is not configured on the server');
  }

  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken, audience: config.google.clientIds });
  } catch (err) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired Google token');
  }

  const payload = ticket.getPayload();
  return {
    uid: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    email_verified: payload.email_verified,
  };
};

module.exports = {
  isConfigured,
  verifyIdToken,
};
